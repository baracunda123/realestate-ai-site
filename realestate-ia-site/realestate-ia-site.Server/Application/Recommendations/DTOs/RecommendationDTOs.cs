namespace realestate_ia_site.Server.Application.Recommendations.DTOs
{
    public class UserBehaviorAnalysis
    {
        public List<string> PreferredLocations { get; set; } = new();
        public List<string> PreferredTypes { get; set; } = new();
        public decimal AveragePriceBudget { get; set; }
        public int? PreferredBedrooms { get; set; }
        public bool PrefersGarage { get; set; }
        public DateTime LastActivityDate { get; set; }
    }

    public class RecommendedPropertyDto
    {
        public required string PropertyId { get; set; }
        public required string Title { get; set; }
        public required string Location { get; set; }
        public decimal? Price { get; set; }
        public int? Bedrooms { get; set; }
        public string? Type { get; set; }
        public int Score { get; set; }
        public required string Reason { get; set; }
        public required string ReasonText { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsViewed { get; set; }
    }

    public class DashboardRecommendationsDto
    {
        public List<RecommendedPropertyDto> Properties { get; set; } = new();
        public int TotalCount { get; set; }
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }
}