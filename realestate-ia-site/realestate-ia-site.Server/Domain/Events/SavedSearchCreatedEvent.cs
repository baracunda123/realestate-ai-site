using realestate_ia_site.Server.Application.Common.Events;
using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Domain.Events
{
    public class SavedSearchCreatedEvent : IDomainEvent
    {
        public Guid Id { get; } = Guid.NewGuid();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
        public string UserId { get; set; } = string.Empty;
        public SavedSearch SavedSearch { get; set; } = null!;
    }
}