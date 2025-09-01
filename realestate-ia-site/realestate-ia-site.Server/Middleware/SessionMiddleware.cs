using Microsoft.Extensions.Primitives;

namespace realestate_ia_site.Server.Middleware
{
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
            _logger.LogInformation("SessionMiddleware executando para: {Method} {Path}", 
                context.Request.Method, context.Request.Path);

            // EXTRAIR Session ID do header
            if (context.Request.Headers.TryGetValue("X-Session-ID", out StringValues sessionValues))
            {
                var sessionId = sessionValues.FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(sessionId))
                {
                    context.Items["SessionId"] = sessionId;
                    _logger.LogInformation("Session ID extraído: {SessionId}", sessionId);
                }
                else
                {
                    _logger.LogWarning("Header X-Session-ID está vazio");
                }
            }
            else
            {
                _logger.LogWarning("Header X-Session-ID não encontrado");
                
                // Debug: Mostrar todos os headers
                var headers = string.Join(", ", context.Request.Headers.Select(h => h.Key));
                _logger.LogDebug("Headers disponíveis: {Headers}", headers);
            }

            await _next(context);
        }
    }
}