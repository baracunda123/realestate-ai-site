using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Application.Payments.DTOs;

public record SubscriptionDto(
    string Id,
    string Status,
    string PriceId,
    string Currency,
    string Interval,
    long Amount,
    DateTime? CurrentPeriodStart,
    DateTime? CurrentPeriodEnd,
    bool CancelAtPeriodEnd,
    DateTime CreatedAt)
{
    public static SubscriptionDto FromDomain(Subscription s) => new(
        s.Id,
        s.Status ?? string.Empty,
        s.PriceId ?? string.Empty,
        s.Currency ?? string.Empty,
        s.Interval ?? string.Empty,
        s.Amount ?? 0,
        s.CurrentPeriodStart.HasValue ? DateTimeOffset.FromUnixTimeSeconds(s.CurrentPeriodStart.Value).UtcDateTime : (DateTime?)null,
        s.CurrentPeriodEnd.HasValue ? DateTimeOffset.FromUnixTimeSeconds(s.CurrentPeriodEnd.Value).UtcDateTime : (DateTime?)null,
        s.CancelAtPeriodEnd ?? false,
        s.CreatedAt
    );
}
