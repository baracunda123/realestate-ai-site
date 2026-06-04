using realestate_ia_site.Server.Application.Security;

namespace realestate_ia_site.Server.Infrastructure.Security
{
    public class SecurityAuditService : ISecurityAuditService
    {
        private readonly ILogger<SecurityAuditService> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public SecurityAuditService(ILogger<SecurityAuditService> logger, IHttpContextAccessor httpContextAccessor)
        {
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        public void LogSecurityEvent(SecurityEventType eventType, string message, object? additionalData = null)
        {
            var context = _httpContextAccessor.HttpContext;
            var userIdentifier = context?.User?.FindFirst("user_id")?.Value ?? "anonymous";
            var sessionId = context?.Items["SessionId"]?.ToString() ?? "unknown";
            var ipAddress = context?.Connection?.RemoteIpAddress?.ToString() ?? "unknown";
            var userAgent = context?.Request?.Headers["User-Agent"].ToString() ?? "unknown";

            switch (eventType)
            {
                case SecurityEventType.LoginSuccess:
                case SecurityEventType.LogoutSuccess:
                case SecurityEventType.TokenRefresh:
                case SecurityEventType.ScraperAuthenticated:
                    _logger.LogInformation("[SECURITY] {EventType}: {Message} | User: {User} | IP: {IP}",
                        eventType, message, userIdentifier, ipAddress);
                    break;

                case SecurityEventType.LoginFailure:
                case SecurityEventType.InvalidToken:
                case SecurityEventType.SuspiciousActivity:
                case SecurityEventType.RateLimitExceeded:
                    _logger.LogWarning("[SECURITY] {EventType}: {Message} | User: {User} | IP: {IP} | Session: {Session}",
                        eventType, message, userIdentifier, ipAddress, sessionId);
                    break;

                case SecurityEventType.BruteForceDetected:
                case SecurityEventType.SqlInjectionAttempt:
                case SecurityEventType.XssAttempt:
                case SecurityEventType.UnauthorizedAccess:
                    _logger.LogError("[SECURITY] {EventType}: {Message} | User: {User} | IP: {IP} | Session: {Session} | UserAgent: {UserAgent}",
                        eventType, message, userIdentifier, ipAddress, sessionId, userAgent);
                    break;
            }
        }

        public void LogFailedLogin(string email, string reason)
        {
            LogSecurityEvent(SecurityEventType.LoginFailure, $"Failed login attempt for email: {email}. Reason: {reason}");
        }

        public void LogSuccessfulLogin(string userId, string email)
        {
            LogSecurityEvent(SecurityEventType.LoginSuccess, $"Successful login for user: {email}", new { UserId = userId });
        }

        public void LogSuspiciousActivity(string activity, string details)
        {
            LogSecurityEvent(SecurityEventType.SuspiciousActivity, $"Suspicious activity detected: {activity}", new { Details = details });
        }

        public void LogInvalidTokenAccess(string tokenType, string reason)
        {
            LogSecurityEvent(SecurityEventType.InvalidToken, $"Invalid {tokenType} token access: {reason}");
        }

        public void LogRateLimitExceeded(string endpoint, int attemptCount)
        {
            LogSecurityEvent(SecurityEventType.RateLimitExceeded, $"Rate limit exceeded for endpoint: {endpoint}", new { AttemptCount = attemptCount });
        }

        public void LogSqlInjectionAttempt(string input, string field)
        {
            LogSecurityEvent(SecurityEventType.SqlInjectionAttempt, $"Potential SQL injection in field: {field}", new { Input = input });
        }

        public void LogXssAttempt(string input, string field)
        {
            LogSecurityEvent(SecurityEventType.XssAttempt, $"Potential XSS attempt in field: {field}", new { Input = input });
        }
    }
}
