using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Infrastructure.Events
{
    public record PropertyCreatedEvent : IDomainEvent
    {
        public Guid Id { get; init; } = Guid.NewGuid();
        public DateTime OccurredAt { get; init; } = DateTime.UtcNow;
        public required string PropertyId { get; init; }
        public required Property Property { get; init; }
    }

    public record PropertyPriceChangedEvent : IDomainEvent
    {
        public Guid Id { get; init; } = Guid.NewGuid();
        public DateTime OccurredAt { get; init; } = DateTime.UtcNow;
        public required string PropertyId { get; init; }
        public required Property Property { get; init; }
        public required decimal OldPrice { get; init; }
        public required decimal NewPrice { get; init; }
    }
}