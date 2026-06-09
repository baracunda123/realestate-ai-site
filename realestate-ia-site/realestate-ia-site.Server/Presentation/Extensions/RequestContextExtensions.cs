using System.Security.Claims;

namespace realestate_ia_site.Server.Presentation.Extensions;

public static class RequestContextExtensions
{
    public static string? GetCurrentUserId(this ClaimsPrincipal user)
    {
        return user.FindFirst("user_id")?.Value;
    }

    public static string? GetSessionId(this HttpContext context)
    {
        return context.Items["SessionId"]?.ToString();
    }
}
