namespace realestate_ia_site.Server.Application.Features.Payments.DTOs;

public class CheckoutSessionData
{
    public string SessionId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? CustomerEmail { get; set; }
    public string? CustomerName { get; set; }
    public long? AmountTotal { get; set; }
    public string? Currency { get; set; }
    public string? SubscriptionId { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
}
