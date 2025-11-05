// SecurityMiddleware.cs - Middleware adicional de segurança
using System.Text;
using System.Text.RegularExpressions;
using System.Text.Json;
using realestate_ia_site.Server.Application.Security;
using realestate_ia_site.Server.Infrastructure.Configurations;
using Microsoft.Extensions.Options;

namespace realestate_ia_site.Server.Infrastructure.Middleware
{
    public class SecurityMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly SecurityAuditService _auditService;
        private readonly ILogger<SecurityMiddleware> _logger;
        private readonly ScraperOptions _scraperOptions;

        // Enhanced patterns para detectar ataques (mais específicos para reduzir falsos positivos)
        private static readonly Regex SqlInjectionPattern = new(@"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE|GRANT|REVOKE)\s+|\s+(OR|AND)\s+[\'\""]\d+[\'\""]\s*=\s*[\'\""]\d+[\'\""]\s*|;\s*-{2}|\/\*.*?\*\/|\x00|\x1a)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex XssPattern = new(@"(<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>|javascript\s*:|on(load|click|error|focus|blur|change|submit|mouseover|mouseout)\s*=|<object\b|<embed\b|<applet\b)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex PathTraversalPattern = new(@"(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%5c)", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex CommandInjectionPattern = new(@"(\|\s*[a-zA-Z]|&&\s*[a-zA-Z]|;\s*[a-zA-Z]|`[^`]*`|\$\([^)]*\)|\$\{[^}]*\}|<\([^)]*\)|>\([^)]*\))", RegexOptions.Compiled);

        // Suspicious User-Agent patterns (excluding our scraper)
        private static readonly string[] SuspiciousUserAgents = {
            "sqlmap", "nikto", "nmap", "masscan", "nessus", "burpsuite", "owasp",
            "dirbuster", "gobuster", "scanner", "hack", "exploit"
        };

        // Paths that should have more lenient validation (auth endpoints, etc.)
        private static readonly string[] LenientValidationPaths = {
            "/api/auth/", "/api/properties/", "/api/favorites/", "/api/search/"
        };

        // Maximum request size (5MB)
        private const long MaxRequestSize = 5 * 1024 * 1024;

        public SecurityMiddleware(RequestDelegate next, SecurityAuditService auditService, ILogger<SecurityMiddleware> logger, IOptions<ScraperOptions> scraperOptions)
        {
            _next = next;
            _auditService = auditService;
            _logger = logger;
            _scraperOptions = scraperOptions.Value;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                // Check if this is a valid scraper request
                if (IsValidScraperRequest(context))
                {
                    _logger.LogInformation("Valid scraper request detected for {Path}", context.Request.Path);
                    // Add security headers and continue without security validation
                    AddSecurityHeaders(context);
                    await _next(context);
                    return;
                }

                // Continue with normal security validation for non-scraper requests
                await ProcessNormalRequest(context);
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

        private bool IsValidScraperRequest(HttpContext context)
        {
            // Check if the path is in the allowed scraper endpoints
            if (!_scraperOptions.IsAllowedEndpoint(context.Request.Path))
            {
                return false;
            }

            // Check for valid API key in header
            var apiKey = context.Request.Headers["X-API-Key"].FirstOrDefault() ??
                        context.Request.Headers["X-Scraper-Key"].FirstOrDefault();

            if (!_scraperOptions.IsValidApiKey(apiKey))
            {
                _auditService.LogSuspiciousActivity("Invalid scraper API key attempt", 
                    $"Path: {context.Request.Path}, IP: {context.Connection.RemoteIpAddress}");
                return false;
            }

            // Optional: Check User-Agent (more lenient for scraper)
            var userAgent = context.Request.Headers["User-Agent"].ToString();
            if (!string.IsNullOrEmpty(_scraperOptions.UserAgent) && 
                !userAgent.Contains(_scraperOptions.UserAgent, StringComparison.OrdinalIgnoreCase))
            {
                _auditService.LogSuspiciousActivity("Scraper with invalid User-Agent", 
                    $"Expected: {_scraperOptions.UserAgent}, Got: {userAgent}");
            }

            // Log successful scraper authentication
            _auditService.LogSecurityEvent(SecurityEventType.ScraperAuthenticated, 
                "Valid scraper request authenticated", 
                new { Path = context.Request.Path.Value, UserAgent = userAgent });

            return true;
        }

        private async Task ProcessNormalRequest(HttpContext context)
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

            // Verificar parâmetros e corpo da requisição (mais leniente para certos endpoints)
            var validationResult = await ValidateRequestSecurity(context);
            if (!validationResult.IsValid)
            {
                // Para endpoints de auth, só bloquear se for realmente malicioso
                bool isLenientPath = LenientValidationPaths.Any(path => context.Request.Path.StartsWithSegments(path));
                
                if (!isLenientPath || validationResult.Errors.Any(e => e.Contains("SQL injection") || e.Contains("Command injection")))
                {
                    _auditService.LogSuspiciousActivity("Malicious content blocked", 
                        $"Path: {context.Request.Path}, Errors: {string.Join(", ", validationResult.Errors)}");
                    
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
                else
                {
                    // Log but don't block for lenient paths with minor issues
                    _logger.LogInformation("Security validation warning on lenient path: {Path}, Errors: {Errors}", 
                        context.Request.Path.Value, string.Join(", ", validationResult.Errors));
                }
            }

            // Adicionar headers de segurança se ainda não existirem
            AddSecurityHeaders(context);

            await _next(context);
        }

        private bool IsSuspiciousUserAgent(string userAgent)
        {
            if (string.IsNullOrEmpty(userAgent)) return true;

            userAgent = userAgent.ToLowerInvariant();

            // Don't flag our scraper as suspicious
            if (!string.IsNullOrEmpty(_scraperOptions.UserAgent) && 
                userAgent.Contains(_scraperOptions.UserAgent.ToLowerInvariant()))
            {
                return false;
            }

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

