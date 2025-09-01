using Microsoft.AspNetCore.Mvc;

namespace realestate_ia_site.Server.Controllers
{
    public abstract class BaseController : ControllerBase
    {
        protected string? GetSessionId()
        {
            return HttpContext.Items["SessionId"]?.ToString();
        }

        protected string? GetAccessToken()
        {
            return HttpContext.Items["AccessToken"]?.ToString();
        }

        protected bool IsAuthenticated()
        {
            return !string.IsNullOrEmpty(GetAccessToken());
        }

        protected string GetSessionIdOrThrow()
        {
            var sessionId = GetSessionId();
            if (string.IsNullOrEmpty(sessionId))
            {
                throw new InvalidOperationException("Session ID é obrigatório");
            }
            return sessionId;
        }
    }
}