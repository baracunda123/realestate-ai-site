using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace realestate_ia_site.Server.Domain.Entities
{
    [Table("saved_searches")]
    public class SavedSearch
    {
        [Key]
        [Column("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("user_id")]
        [Required]
        public string UserId { get; set; } = string.Empty;

        [Column("name")]
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;

        [Column("query")]
        [Required]
        [MaxLength(500)]
        public string Query { get; set; } = string.Empty;

        // Search filters as individual columns
        [Column("location")]
        [MaxLength(200)]
        public string? Location { get; set; }

        [Column("property_type")]
        [MaxLength(50)]
        public string? PropertyType { get; set; }

        [Column("min_price")]
        public decimal? MinPrice { get; set; }

        [Column("max_price")]
        public decimal? MaxPrice { get; set; }

        [Column("bedrooms")]
        public int? Bedrooms { get; set; }

        [Column("bathrooms")]
        public int? Bathrooms { get; set; }

        [Column("has_garage")]
        public bool HasGarage { get; set; } = false;

        // Simple tracking without separate execution table
        [Column("results_count")]
        public int ResultsCount { get; set; } = 0;

        [Column("new_results_count")]
        public int NewResultsCount { get; set; } = 0;

        [Column("last_executed_at")]
        public DateTime? LastExecutedAt { get; set; }

        [Column("last_viewed_at")]
        public DateTime? LastViewedAt { get; set; }

        // Metadata
        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        // Navigation properties
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;

        // Helper methods
        public void UpdateResults(int newCount, int totalCount)
        {
            var previousCount = ResultsCount;
            ResultsCount = totalCount;
            NewResultsCount = Math.Max(0, totalCount - previousCount);
            LastExecutedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
        }

        public void MarkAsViewed()
        {
            NewResultsCount = 0;
            LastViewedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
        }

        public bool HasNewResults => NewResultsCount > 0;

        public string GetPerformanceLevel()
        {
            return ResultsCount switch
            {
                0 => "none",
                >= 20 => "excellent",
                >= 10 => "good",
                _ => "poor"
            };
        }
    }
}