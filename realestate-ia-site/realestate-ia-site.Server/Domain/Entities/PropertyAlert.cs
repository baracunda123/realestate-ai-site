using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace realestate_ia_site.Server.Domain.Entities
{
    [Table("property_alerts")]
    public class PropertyAlert
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("user_id")]
        public required string UserId { get; set; }

        [Required]
        [Column("name")]
        [MaxLength(200)]
        public required string Name { get; set; }

        [Column("location")]
        [MaxLength(500)]
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

        [Column("price_drop_alerts")]
        public bool PriceDropAlerts { get; set; } = true;

        [Column("new_listing_alerts")]
        public bool NewListingAlerts { get; set; } = true;

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("last_triggered")]
        public DateTime? LastTriggered { get; set; }

        [Column("match_count")]
        public int MatchCount { get; set; } = 0;

        [Column("new_matches")]
        public int NewMatches { get; set; } = 0;

        // Navegação
        public virtual User User { get; set; } = null!;
    }
}