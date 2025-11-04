using Microsoft.AspNetCore.Mvc;
using System.Net;
using System.Text.Json;
using System.Diagnostics;
using realestate_ia_site.Server.Application.Common.Exceptions;
using realestate_ia_site.Server.Application.Security;
using AppUnauthorizedException = realestate_ia_site.Server.Application.Common.Exceptions.UnauthorizedAccessException;

namespace realestate_ia_site.Server.Infrastructure.Middleware
{
    /// <summary>
    /// Middleware para tratamento global de exceções
    /// </summary>
    public class GlobalExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionHandlingMiddleware> _logger;
        private readonly SecurityAuditService _auditService;
        private readonly IHostEnvironment _environment;

        public GlobalExceptionHandlingMiddleware(
            RequestDelegate next,
            ILogger<GlobalExceptionHandlingMiddleware> logger,
            SecurityAuditService auditService,
            IHostEnvironment environment)
        {
            _next = next;
            _logger = logger;
            _auditService = auditService;
            _environment = environment;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                // AZURE FIX: Handle cases where services might not be available during startup
                try
                {
                    await HandleExceptionAsync(context, ex);
                }
                catch (Exception handlerEx)
                {
                    // If error handler fails, log to console and return basic error
                    Console.WriteLine($"Error handler failed: {handlerEx.Message}");
                    
                    if (!context.Response.HasStarted)
                    {
                        context.Response.StatusCode = 500;
                        context.Response.ContentType = "application/json";
                        await context.Response.WriteAsync("{\"error\":\"Internal server error\"}");
                    }
                }
            }
        }

        private async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            var response = context.Response;
            var request = context.Request;
            
            // Ensure response hasn't started
            if (response.HasStarted)
            {
                _logger.LogWarning("Cannot write to response as it has already started");
                return;
            }

            response.ContentType = "application/json";

            var errorResponse = exception switch
            {
                PropertyNotFoundException ex => CreateErrorResponse(
                    HttpStatusCode.NotFound, 
                    ex.ErrorCode, 
                    ex.UserMessage, 
                    ex.Details),

                InvalidSearchFiltersException ex => CreateErrorResponse(
                    HttpStatusCode.BadRequest, 
                    ex.ErrorCode, 
                    ex.UserMessage, 
                    ex.Details),

                SearchLimitExceededException ex => CreateErrorResponse(
                    HttpStatusCode.BadRequest, 
                    ex.ErrorCode, 
                    ex.UserMessage, 
                    ex.Details),

                AppUnauthorizedException ex => CreateErrorResponse(
                    HttpStatusCode.Unauthorized, 
                    ex.ErrorCode, 
                    ex.UserMessage, 
                    ex.Details),

                PremiumRequiredException ex => CreateErrorResponse(
                    HttpStatusCode.PaymentRequired, 
                    ex.ErrorCode, 
                    ex.UserMessage, 
                    ex.Details),

                InvalidPropertyDataException ex => CreateErrorResponse(
                    HttpStatusCode.BadRequest, 
                    ex.ErrorCode, 
                    ex.UserMessage, 
                    ex.Details),

                LocationNotFoundException ex => CreateErrorResponse(
                    HttpStatusCode.NotFound, 
                    ex.ErrorCode, 
                    ex.UserMessage, 
                    ex.Details),

                ExternalServiceException ex => CreateErrorResponse(
                    HttpStatusCode.ServiceUnavailable, 
                    ex.ErrorCode, 
                    ex.UserMessage, 
                    ex.Details),

                DuplicateDataException ex => CreateErrorResponse(
                    HttpStatusCode.Conflict, 
                    ex.ErrorCode, 
                    ex.UserMessage, 
                    ex.Details),

                ValidationException ex => CreateValidationErrorResponse(ex),

                TaskCanceledException ex when ex.InnerException is TimeoutException => CreateErrorResponse(
                    HttpStatusCode.RequestTimeout, 
                    "REQUEST_TIMEOUT", 
                    "A solicitação demorou muito tempo para ser processada"),

                OperationCanceledException => CreateErrorResponse(
                    HttpStatusCode.RequestTimeout, 
                    "REQUEST_CANCELLED", 
                    "A solicitação foi cancelada"),

                ArgumentException ex => CreateErrorResponse(
                    HttpStatusCode.BadRequest, 
                    "INVALID_ARGUMENT", 
                    "Parâmetro inválido fornecido",
                    _environment.IsDevelopment() ? new { Parameter = ex.ParamName, Message = ex.Message } : null),

                KeyNotFoundException ex => CreateErrorResponse(
                    HttpStatusCode.NotFound, 
                    "RESOURCE_NOT_FOUND", 
                    "Recurso não encontrado"),

                System.UnauthorizedAccessException => CreateErrorResponse(
                    HttpStatusCode.Unauthorized, 
                    "UNAUTHORIZED", 
                    "Acesso não autorizado"),

                _ => CreateErrorResponse(
                    HttpStatusCode.InternalServerError, 
                    "INTERNAL_ERROR", 
                    "Erro interno do servidor")
            };

            response.StatusCode = (int)errorResponse.StatusCode;

            // Log the exception
            LogException(context, exception, errorResponse.StatusCode);

            // Audit security-related exceptions
            AuditSecurityException(context, exception);

            // Write response
            var jsonResponse = JsonSerializer.Serialize(errorResponse.Body, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            await response.WriteAsync(jsonResponse);
        }

        private ErrorResponse CreateErrorResponse(
            HttpStatusCode statusCode, 
            string errorCode, 
            string message, 
            object? details = null)
        {
            var body = new
            {
                Error = new
                {
                    Code = errorCode,
                    Message = message,
                    Details = details,
                    Timestamp = DateTime.UtcNow,
                    TraceId = Activity.Current?.Id
                }
            };

            return new ErrorResponse(statusCode, body);
        }

        private ErrorResponse CreateValidationErrorResponse(ValidationException ex)
        {
            var body = new
            {
                Error = new
                {
                    Code = ex.ErrorCode,
                    Message = ex.UserMessage,
                    ValidationErrors = ex.ValidationErrors,
                    Timestamp = DateTime.UtcNow,
                    TraceId = Activity.Current?.Id
                }
            };

            return new ErrorResponse(HttpStatusCode.BadRequest, body);
        }

        private void LogException(HttpContext context, Exception exception, HttpStatusCode statusCode)
        {
            var logLevel = statusCode switch
            {
                HttpStatusCode.InternalServerError => LogLevel.Error,
                HttpStatusCode.ServiceUnavailable => LogLevel.Warning,
                HttpStatusCode.BadRequest => LogLevel.Information,
                HttpStatusCode.Unauthorized => LogLevel.Warning,
                HttpStatusCode.NotFound => LogLevel.Information,
                _ => LogLevel.Information
            };

            var requestInfo = new
            {
                Method = context.Request.Method,
                Path = context.Request.Path.Value,
                QueryString = context.Request.QueryString.Value,
                UserAgent = context.Request.Headers["User-Agent"].FirstOrDefault(),
                RemoteIpAddress = context.Connection.RemoteIpAddress?.ToString(),
                UserId = context.User?.FindFirst("user_id")?.Value
            };

            _logger.Log(logLevel, exception, 
                "Exception occurred. Status: {StatusCode}, Request: {@RequestInfo}", 
                statusCode, requestInfo);
        }

        private void AuditSecurityException(HttpContext context, Exception exception)
        {
            switch (exception)
            {
                case AppUnauthorizedException:
                case System.UnauthorizedAccessException:
                    _auditService.LogInvalidTokenAccess("middleware", exception.Message);
                    break;

                case PremiumRequiredException:
                    _auditService.LogSuspiciousActivity("Premium feature access attempt", 
                        $"Path: {context.Request.Path}, User: {context.User?.FindFirst("user_id")?.Value}");
                    break;

                case InvalidSearchFiltersException:
                case SearchLimitExceededException:
                    _auditService.LogSuspiciousActivity("Invalid search attempt", 
                        $"Path: {context.Request.Path}, Exception: {exception.GetType().Name}");
                    break;
            }
        }

        private record ErrorResponse(HttpStatusCode StatusCode, object Body);
    }

    /// <summary>
    /// Extensão para registrar o middleware
    /// </summary>
    public static class GlobalExceptionHandlingMiddlewareExtensions
    {
        public static IApplicationBuilder UseGlobalExceptionHandling(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<GlobalExceptionHandlingMiddleware>();
        }
    }
}
