using realestate_ia_site.Server.Application.Common.Events;

namespace realestate_ia_site.Server.Domain.Events
{
    public class SearchExecutedEvent : IDomainEvent
    {
        public Guid Id { get; } = Guid.NewGuid();
        public DateTime OccurredAt { get; } = DateTime.UtcNow;
        
        public string? UserId { get; set; }
        public string? SessionId { get; set; }
        public required string SearchQuery { get; set; }
        public Dictionary<string, object>? Filters { get; set; }
        public int ResultsCount { get; set; }
        public string? IpAddress { get; set; }
    }
}