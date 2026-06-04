namespace realestate_ia_site.Server.Application.Features.Payments.DTOs;

public record WebhookProcessResult(bool Success, string Message)
{
    public static WebhookProcessResult SuccessResult(string message) => new(true, message);
    public static WebhookProcessResult Failure(string message) => new(false, message);
}
