using System.ComponentModel.DataAnnotations;

namespace realestate_ia_site.Server.Domain.Models
{
    public class CreateCheckoutSessionRequest
    {
        [Required]
        public string PriceId { get; set; } = string.Empty;
        
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        public string? SuccessUrl { get; set; }
        public string? CancelUrl { get; set; }
        public Dictionary<string, string>? Metadata { get; set; }
    }

    public class SubscriptionResult
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string? CheckoutUrl { get; set; }
        public string? SubscriptionId { get; set; }
        public string? CustomerId { get; set; }
        public string? Error { get; set; }
    }

    public class CreateSubscriptionRequest
    {
        [Required]
        public string PlanId { get; set; } = string.Empty;
    }

    public class UpdateSubscriptionRequest
    {
        [Required]
        public string NewPriceId { get; set; } = string.Empty;
    }

    public class CancelSubscriptionRequest
    {
        public string? Reason { get; set; }
        public string? Comment { get; set; }
        public bool CancelImmediately { get; set; } = false;
    }

    public class SubscriptionDto
    {
        public string Id { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string PriceId { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public string Interval { get; set; } = string.Empty;
        public long Amount { get; set; }
        public DateTime? CurrentPeriodStart { get; set; }
        public DateTime? CurrentPeriodEnd { get; set; }
        public bool CancelAtPeriodEnd { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class WebhookResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}