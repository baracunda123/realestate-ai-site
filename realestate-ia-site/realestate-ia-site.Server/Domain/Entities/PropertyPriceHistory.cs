using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace realestate_ia_site.Server.Domain.Entities
{
    [Table("property_price_histories")]
    public class PropertyPriceHistory
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [Column("property_id")]
        public string PropertyId { get; set; } = string.Empty;

        [Column("old_price")]
        public decimal OldPrice { get; set; }

        [Column("new_price")]
        public decimal NewPrice { get; set; }

        [Column("changed_at")]
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

        [Column("change_reason")]
        [MaxLength(100)]
        public string? ChangeReason { get; set; } // "manual_update", "scraper_update", etc.

        // Navegação
        public virtual Property Property { get; set; } = null!;
    }
}