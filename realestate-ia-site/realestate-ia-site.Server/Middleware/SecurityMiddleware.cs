// SecurityMiddleware.cs - Middleware adicional de segurança
using System.Text;
using System.Text.RegularExpressions;
using System.Text.Json;
using realestate_ia_site.Server.Application.Security;

namespace realestate_ia_site.Server.Middleware
{
    public class SecurityMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly SecurityAuditService _auditService;
        private readonly ILogger<SecurityMiddleware> _logger;

        // Enhanced patterns para detectar ataques
        private static readonly Regex SqlInjectionPattern = new(@"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE|GRANT|REVOKE)\b|;|--|\/\*|\*\/|'|\x00|\x1a)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex XssPattern = new(@"(<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>|javascript:|on\w+\s*=|<object|<embed|<applet)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex PathTraversalPattern = new(@"(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex CommandInjectionPattern = new(@"(\||&&|;|`|\$\(|\${|<\(|>\()", RegexOptions.Compiled);

        // Suspicious User-Agent patterns
        private static readonly string[] SuspiciousUserAgents = {
            "sqlmap", "nikto", "nmap", "masscan", "nessus", "burpsuite", "owasp",
            "dirbuster", "gobuster", "python-requests", "curl", "wget", "scanner",
            "bot", "crawler", "spider", "scraper", "hack", "exploit", "test"
        };

        // Maximum request size (5MB)
        private const long MaxRequestSize = 5 * 1024 * 1024;

        public SecurityMiddleware(RequestDelegate next, SecurityAuditService auditService, ILogger<SecurityMiddleware> logger)
        {
            _next = next;
            _auditService = auditService;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                // Check request size
                if (context.Request.ContentLength > MaxRequestSize)
                {
                    _auditService.LogSuspiciousActivity("Request size too large", $"Size: {context.Request.ContentLength} bytes");
                    context.Response.StatusCode = 413; // Payload Too Large
                    await context.Response.WriteAsync("Request too large");
                    return;
                }

                // Verificar User-Agent suspeito
                var userAgent = context.Request.Headers["User-Agent"].ToString();
                if (IsSuspiciousUserAgent(userAgent))
                {
                    _auditService.LogSuspiciousActivity("Suspicious User-Agent", userAgent);
                    // Continue but log - don't block as some legitimate clients might trigger this
                }

                // Verificar headers suspeitos
                ValidateSuspiciousHeaders(context);

                // Verificar path traversal na URL
                if (PathTraversalPattern.IsMatch(context.Request.Path))
                {
                    _auditService.LogSuspiciousActivity("Path traversal attempt", context.Request.Path);
                    context.Response.StatusCode = 400;
                    await context.Response.WriteAsync("Invalid request path");
                    return;
                }

                // Verificar parâmetros e corpo da requisição
                var validationResult = await ValidateRequestSecurity(context);
                if (!validationResult.IsValid)
                {
                    context.Response.StatusCode = 400;
                    context.Response.ContentType = "application/json";
                    var response = JsonSerializer.Serialize(new
                    {
                        message = "Request contains potentially malicious content",
                        errors = validationResult.Errors
                    });
                    await context.Response.WriteAsync(response);
                    return;
                }

                // Adicionar headers de segurança se ainda não existirem
                AddSecurityHeaders(context);

                await _next(context);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SecurityMiddleware");
                _auditService.LogSuspiciousActivity("SecurityMiddleware exception", ex.Message);

                // Don't expose internal errors
                if (!context.Response.HasStarted)
                {
                    context.Response.StatusCode = 500;
                    await context.Response.WriteAsync("Internal server error");
                }
            }
        }

        private bool IsSuspiciousUserAgent(string userAgent)
        {
            if (string.IsNullOrEmpty(userAgent)) return true;

            userAgent = userAgent.ToLowerInvariant();

            return SuspiciousUserAgents.Any(pattern => userAgent.Contains(pattern)) ||
                   userAgent.Length < 10 || // Too short
                   userAgent.Length > 500;  // Too long
        }

        private void ValidateSuspiciousHeaders(HttpContext context)
        {
            var suspiciousHeaders = new[] { "X-Forwarded-For", "X-Real-IP", "X-Originating-IP" };

            foreach (var header in suspiciousHeaders)
            {
                if (context.Request.Headers.ContainsKey(header))
                {
                    var value = context.Request.Headers[header].ToString();
                    if (SqlInjectionPattern.IsMatch(value) || XssPattern.IsMatch(value))
                    {
                        _auditService.LogSuspiciousActivity($"Malicious content in {header} header", value);
                    }
                }
            }
        }

        private async Task<SecurityValidationResult> ValidateRequestSecurity(HttpContext context)
        {
            var result = new SecurityValidationResult { IsValid = true, Errors = new List<string>() };

            // Verificar query parameters
            foreach (var param in context.Request.Query)
            {
                var validation = ValidateParameter(param.Key, param.Value, "query");
                if (!validation.IsValid)
                {
                    result.IsValid = false;
                    result.Errors.AddRange(validation.Errors);
                }
            }

            // Verificar form data se POST/PUT
            if (context.Request.HasFormContentType &&
                (context.Request.Method == "POST" || context.Request.Method == "PUT"))
            {
                try
                {
                    var form = await context.Request.ReadFormAsync();
                    foreach (var field in form)
                    {
                        var validation = ValidateParameter(field.Key, field.Value, "form");
                        if (!validation.IsValid)
                        {
                            result.IsValid = false;
                            result.Errors.AddRange(validation.Errors);
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Error reading form data: {Error}", ex.Message);
                }
            }

            // Verificar JSON body se aplicável
            if (context.Request.ContentType?.Contains("application/json") == true)
            {
                var bodyValidation = await ValidateJsonBody(context);
                if (!bodyValidation.IsValid)
                {
                    result.IsValid = false;
                    result.Errors.AddRange(bodyValidation.Errors);
                }
            }

            return result;
        }

        private SecurityValidationResult ValidateParameter(string name, Microsoft.Extensions.Primitives.StringValues values, string source)
        {
            var result = new SecurityValidationResult { IsValid = true, Errors = new List<string>() };

            foreach (var value in values)
            {
                if (string.IsNullOrEmpty(value)) continue;

                // SQL Injection check
                if (SqlInjectionPattern.IsMatch(value))
                {
                    _auditService.LogSqlInjectionAttempt(value, $"{source}.{name}");
                    result.IsValid = false;
                    result.Errors.Add($"SQL injection detected in {source} parameter '{name}'");
                }

                // XSS check
                if (XssPattern.IsMatch(value))
                {
                    _auditService.LogXssAttempt(value, $"{source}.{name}");
                    result.IsValid = false;
                    result.Errors.Add($"XSS attempt detected in {source} parameter '{name}'");
                }

                // Command injection check
                if (CommandInjectionPattern.IsMatch(value))
                {
                    _auditService.LogSuspiciousActivity("Command injection attempt", $"{source}.{name}: {value}");
                    result.IsValid = false;
                    result.Errors.Add($"Command injection detected in {source} parameter '{name}'");
                }

                // Path traversal check
                if (PathTraversalPattern.IsMatch(value))
                {
                    _auditService.LogSuspiciousActivity("Path traversal attempt", $"{source}.{name}: {value}");
                    result.IsValid = false;
                    result.Errors.Add($"Path traversal detected in {source} parameter '{name}'");
                }

                // Length check
                if (value.Length > 10000) // Max 10KB per parameter
                {
                    _auditService.LogSuspiciousActivity("Parameter too long", $"{source}.{name}: {value.Length} chars");
                    result.IsValid = false;
                    result.Errors.Add($"Parameter '{name}' too long");
                }
            }

            return result;
        }

        private async Task<SecurityValidationResult> ValidateJsonBody(HttpContext context)
        {
            var result = new SecurityValidationResult { IsValid = true, Errors = new List<string>() };

            try
            {
                context.Request.EnableBuffering();

                using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, leaveOpen: true);
                var body = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0;

                if (!string.IsNullOrEmpty(body))
                {
                    // Check body size
                    if (body.Length > 1000000) // Max 1MB JSON
                    {
                        _auditService.LogSuspiciousActivity("JSON body too large", $"Size: {body.Length} chars");
                        result.IsValid = false;
                        result.Errors.Add("Request body too large");
                        return result;
                    }

                    var truncatedBody = body.Length > 500 ? body.Substring(0, 500) + "..." : body;

                    // SQL Injection check
                    if (SqlInjectionPattern.IsMatch(body))
                    {
                        _auditService.LogSqlInjectionAttempt(truncatedBody, "json.body");
                        result.IsValid = false;
                        result.Errors.Add("SQL injection detected in request body");
                    }

                    // XSS check
                    if (XssPattern.IsMatch(body))
                    {
                        _auditService.LogXssAttempt(truncatedBody, "json.body");
                        result.IsValid = false;
                        result.Errors.Add("XSS attempt detected in request body");
                    }

                    // Command injection check
                    if (CommandInjectionPattern.IsMatch(body))
                    {
                        _auditService.LogSuspiciousActivity("Command injection in JSON", truncatedBody);
                        result.IsValid = false;
                        result.Errors.Add("Command injection detected in request body");
                    }

                    // Try to parse JSON for deeper validation
                    try
                    {
                        using var doc = JsonDocument.Parse(body);
                        ValidateJsonElement(doc.RootElement, result, "");
                    }
                    catch (JsonException)
                    {
                        // Invalid JSON is handled by model binding, not a security issue
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Error validating JSON body: {Error}", ex.Message);
            }

            return result;
        }

        private void ValidateJsonElement(JsonElement element, SecurityValidationResult result, string path)
        {
            switch (element.ValueKind)
            {
                case JsonValueKind.String:
                    var stringValue = element.GetString();
                    if (!string.IsNullOrEmpty(stringValue))
                    {
                        if (SqlInjectionPattern.IsMatch(stringValue))
                        {
                            _auditService.LogSqlInjectionAttempt(stringValue, $"json{path}");
                            result.IsValid = false;
                            result.Errors.Add($"SQL injection detected in JSON at {path}");
                        }
                        if (XssPattern.IsMatch(stringValue))
                        {
                            _auditService.LogXssAttempt(stringValue, $"json{path}");
                            result.IsValid = false;
                            result.Errors.Add($"XSS attempt detected in JSON at {path}");
                        }
                    }
                    break;

                case JsonValueKind.Object:
                    foreach (var property in element.EnumerateObject())
                    {
                        ValidateJsonElement(property.Value, result, $"{path}.{property.Name}");
                    }
                    break;

                case JsonValueKind.Array:
                    var index = 0;
                    foreach (var item in element.EnumerateArray())
                    {
                        ValidateJsonElement(item, result, $"{path}[{index}]");
                        index++;
                    }
                    break;
            }
        }

        private static void AddSecurityHeaders(HttpContext context)
        {
            var headers = context.Response.Headers;

            // Only add if not already present
            if (!headers.ContainsKey("X-Content-Type-Options"))
                headers["X-Content-Type-Options"] = "nosniff";

            if (!headers.ContainsKey("X-Frame-Options"))
                headers["X-Frame-Options"] = "DENY";

            if (!headers.ContainsKey("X-XSS-Protection"))
                headers["X-XSS-Protection"] = "1; mode=block";

            if (!headers.ContainsKey("Referrer-Policy"))
                headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

            if (!headers.ContainsKey("Permissions-Policy"))
                headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=(), payment=()";

            // Remove server information
            headers.Remove("Server");
            headers.Remove("X-Powered-By");
        }
    }

    public class SecurityValidationResult
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new();
    }
}
    