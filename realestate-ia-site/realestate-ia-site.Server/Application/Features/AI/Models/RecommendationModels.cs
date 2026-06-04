using realestate_ia_site.Server.Application.Features.Properties.DTOs;

namespace realestate_ia_site.Server.Application.Features.AI.Models;

public class UserBehaviorData
{
    public List<SearchHistoryItem> SearchHistory { get; set; } = new();
    public List<PropertySearchDto> ViewedProperties { get; set; } = new();
    public TimeSpan TimeOnPlatform { get; set; }
    public int SessionCount { get; set; }
    public int FavoritedCount { get; set; }
}

public class SearchHistoryItem
{
    public string Query { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public decimal MinPrice { get; set; }
    public decimal MaxPrice { get; set; }
    public DateTime Timestamp { get; set; }
}

public class RecommendationInsights
{
    public List<string> SearchPatterns { get; set; } = new();
    public string Evolution { get; set; } = string.Empty;
    public List<string> ImplicitPreferences { get; set; } = new();
    public BudgetRange RealBudget { get; set; } = new();
    public List<string> WillingToCompromise { get; set; } = new();
    public List<string> NextSteps { get; set; } = new();
    public List<string> MustSeeProperties { get; set; } = new();
    public int ConfidenceScore { get; set; }
}

public class BudgetRange
{
    public decimal Min { get; set; }
    public decimal Max { get; set; }
}
