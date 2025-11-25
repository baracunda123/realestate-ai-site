using Microsoft.Extensions.Primitives;

namespace realestate_ia_site.Server.Infrastructure.Middleware
{
    /// <summary>
    /// Middleware para extracao de Session ID do header X-Session-ID.
    /// Usado para analytics, tracking e historico temporario de utilizadores anonimos.
    /// </summary>
    public class SessionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<SessionMiddleware> _logger;

        public SessionMiddleware(RequestDelegate next, ILogger<SessionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Extrair Session ID do header (enviado pelo frontend)
            if (context.Request.Headers.TryGetValue("X-Session-ID", out StringValues sessionValues))
            {
                var sessionId = sessionValues.FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(sessionId))
                {
                    context.Items["SessionId"] = sessionId;
                    _logger.LogDebug("Session ID extraido: {SessionId}", sessionId.Substring(0, 8));
                }
            }

            await _next(context);
        }
    }
}
