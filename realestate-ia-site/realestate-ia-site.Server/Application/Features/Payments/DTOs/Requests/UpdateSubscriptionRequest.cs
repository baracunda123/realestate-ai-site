using System.ComponentModel.DataAnnotations;

namespace realestate_ia_site.Server.Application.Features.Payments.DTOs;

public class UpdateSubscriptionRequest
{
    [Required]
    public string NewPriceId { get; set; } = string.Empty;
}
