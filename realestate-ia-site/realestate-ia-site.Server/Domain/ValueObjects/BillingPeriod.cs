namespace realestate_ia_site.Server.Domain.ValueObjects;

// Value Object para representar janelas de período de faturação (epoch seconds encapsulados)
public readonly record struct BillingPeriod(long? StartEpoch, long? EndEpoch)
{
    public DateTime? StartUtc => StartEpoch.HasValue ? DateTimeOffset.FromUnixTimeSeconds(StartEpoch.Value).UtcDateTime : null;
    public DateTime? EndUtc => EndEpoch.HasValue ? DateTimeOffset.FromUnixTimeSeconds(EndEpoch.Value).UtcDateTime : null;
    public bool IsActive(DateTime utcNow) => StartUtc.HasValue && EndUtc.HasValue && utcNow >= StartUtc && utcNow <= EndUtc;
    public static BillingPeriod From(long? start, long? end) => new(start, end);
}
