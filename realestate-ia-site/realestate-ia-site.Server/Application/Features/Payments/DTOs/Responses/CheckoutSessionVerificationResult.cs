namespace realestate_ia_site.Server.Application.Features.Payments.DTOs;

public class CheckoutSessionVerificationResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? Error { get; set; }
    public CheckoutSessionData? SessionData { get; set; }
}
