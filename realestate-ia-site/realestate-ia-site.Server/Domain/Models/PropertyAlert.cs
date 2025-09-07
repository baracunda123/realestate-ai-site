namespace realestate_ia_site.Server.Domain.Models
{
    public class PropertyAlert
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public required string UserId { get; set; }
        public required string Name { get; set; }
        public string? Location { get; set; }
        public string? PropertyType { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int? Bedrooms { get; set; }
        public int? Bathrooms { get; set; }
        public bool EmailNotifications { get; set; } = true;
        public bool SmsNotifications { get; set; } = false;
        public bool PriceDropAlerts { get; set; } = true;
        public bool NewListingAlerts { get; set; } = true;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastTriggered { get; set; }
        public int MatchCount { get; set; }
        public int NewMatches { get; set; }
    }
}