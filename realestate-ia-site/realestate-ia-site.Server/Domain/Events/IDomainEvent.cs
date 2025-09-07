namespace realestate_ia_site.Server.Domain.Events
{
    public interface IDomainEvent
    {
        Guid Id { get; }
        DateTime OccurredAt { get; }
    }
}
