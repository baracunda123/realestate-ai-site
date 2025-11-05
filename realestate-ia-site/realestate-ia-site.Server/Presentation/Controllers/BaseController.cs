using Microsoft.AspNetCore.Mvc;

namespace realestate_ia_site.Server.Presentation.Controllers
{
    public abstract class BaseController : ControllerBase
    {
        /// <summary>
        /// Obtém o Session ID do middleware, obrigatório para rastreamento
        /// </summary>
        protected string GetSessionIdOrThrow()
        {
            var sessionId = HttpContext.Items["SessionId"]?.ToString();
            if (string.IsNullOrEmpty(sessionId))
            {
                throw new InvalidOperationException("Session ID é obrigatório");
            }
            return sessionId;
        }

        /// <summary>
        /// Obtém o Session ID do middleware (pode ser null)
        /// </summary>
        protected string? GetSessionId()
        {
            return HttpContext.Items["SessionId"]?.ToString();
        }

        /// <summary>
        /// Obtém o User ID do JWT token (para controllers com [Authorize])
        /// </summary>
        protected string? GetCurrentUserId()
        {
            return User?.FindFirst("user_id")?.Value;
        }

        /// <summary>
        /// Obtém o email do usuário do JWT token (para controllers com [Authorize])
        /// </summary>
        protected string? GetCurrentUserEmail()
        {
            return User?.FindFirst("email")?.Value;
        }
    }
}

