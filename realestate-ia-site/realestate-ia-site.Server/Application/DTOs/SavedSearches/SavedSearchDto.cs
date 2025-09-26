namespace realestate_ia_site.Server.Application.DTOs.SavedSearches
{
    public class SavedSearchDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Query { get; set; } = string.Empty;
        public SavedSearchFiltersDto Filters { get; set; } = new();
        public int Results { get; set; }
        public int NewResults { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public DateTime? LastExecutedAt { get; set; }
        public DateTime? LastViewedAt { get; set; }
        public bool IsActive { get; set; }
    }

    public class SavedSearchFiltersDto
    {
        public string? Location { get; set; }
        public string? PropertyType { get; set; }
        public decimal[]? PriceRange { get; set; }
        public int? Bedrooms { get; set; }
        public int? Bathrooms { get; set; }
        public bool? HasGarage { get; set; }
    }

    public class CreateSavedSearchRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Query { get; set; } = string.Empty;
        public SavedSearchFiltersDto Filters { get; set; } = new();
        public int Results { get; set; }
    }

    public class UpdateSavedSearchRequest
    {
        public string? Name { get; set; }
        public string? Query { get; set; }
        public SavedSearchFiltersDto? Filters { get; set; }
        public bool? IsActive { get; set; }
    }

    public class SavedSearchesResponse
    {
        public List<SavedSearchDto> Searches { get; set; } = new();
        public int TotalCount { get; set; }
        public int ActiveCount { get; set; }
        public int NewResultsCount { get; set; }
    }

    // Simplified - no execution complexity needed
    public class SavedSearchStatsResponse
    {
        public int TotalSearches { get; set; }
        public int TotalResults { get; set; }
        public int NewResults { get; set; }
        public MostSuccessfulSearchDto? MostSuccessfulSearch { get; set; }
        public List<RecentActivityDto> RecentActivity { get; set; } = new();
    }

    public class MostSuccessfulSearchDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public int ResultCount { get; set; }
    }

    public class RecentActivityDto
    {
        public string SearchId { get; set; } = string.Empty;
        public string SearchName { get; set; } = string.Empty;
        public DateTime ExecutedAt { get; set; }
        public int ResultCount { get; set; }
        public int NewResults { get; set; }
    }

    public class DuplicateSearchRequest
    {
        public string? NewName { get; set; }
    }

    public class SuccessResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}