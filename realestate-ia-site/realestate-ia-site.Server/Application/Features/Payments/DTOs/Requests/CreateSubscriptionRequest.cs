using System.ComponentModel.DataAnnotations;

namespace realestate_ia_site.Server.Application.Features.Payments.DTOs;

public class CreateSubscriptionRequest
{
    [Required]
    public string PlanId { get; set; } = string.Empty;
}
