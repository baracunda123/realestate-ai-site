namespace realestate_ia_site.Server.Application.Features.Payments.DTOs;

public class CancelSubscriptionRequest
{
    public string? Reason { get; set; }
    public string? Comment { get; set; }
    public bool CancelImmediately { get; set; } = false;
}
