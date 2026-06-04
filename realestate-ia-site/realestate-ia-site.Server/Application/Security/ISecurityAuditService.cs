namespace realestate_ia_site.Server.Application.Security
{
    public interface ISecurityAuditService
    {
        void LogSecurityEvent(SecurityEventType eventType, string message, object? additionalData = null);
        void LogFailedLogin(string email, string reason);
        void LogSuccessfulLogin(string userId, string email);
        void LogSuspiciousActivity(string activity, string details);
        void LogInvalidTokenAccess(string tokenType, string reason);
        void LogRateLimitExceeded(string endpoint, int attemptCount);
        void LogSqlInjectionAttempt(string input, string field);
        void LogXssAttempt(string input, string field);
    }

    public enum SecurityEventType
    {
        LoginSuccess,
        LoginFailure,
        LogoutSuccess,
        TokenRefresh,
        InvalidToken,
        SuspiciousActivity,
        RateLimitExceeded,
        BruteForceDetected,
        SqlInjectionAttempt,
        XssAttempt,
        UnauthorizedAccess,
        ScraperAuthenticated
    }
}
