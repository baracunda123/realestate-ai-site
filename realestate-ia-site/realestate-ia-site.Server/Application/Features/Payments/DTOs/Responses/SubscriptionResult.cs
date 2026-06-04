namespace realestate_ia_site.Server.Application.Features.Payments.DTOs;

public class SubscriptionResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? CheckoutUrl { get; set; }
    public string? SubscriptionId { get; set; }
    public string? CustomerId { get; set; }
    public string? Error { get; set; }
}
