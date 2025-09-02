using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Domain.Models
{
    public class PropertyPriceHistory
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public string PropertyId { get; set; } = string.Empty;
        public Property Property { get; set; } = null!;
        public decimal OldPrice { get; set; }
        public decimal NewPrice { get; set; }
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
        public string? ChangeReason { get; set; } // "manual_update", "scraper_update", etc.
    }
}