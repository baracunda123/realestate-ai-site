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
        [Column("property_id")]
        public required string PropertyId { get; set; }

        [Required]
        [Column("property_title")]
        [MaxLength(500)]
        public required string PropertyTitle { get; set; }

        [Required]
        [Column("property_location")]
        [MaxLength(500)]
        public required string PropertyLocation { get; set; }

        [Required]
        [Column("current_price")]
        public decimal CurrentPrice { get; set; }

        [Column("alert_threshold_percentage")]
        public int AlertThresholdPercentage { get; set; } = 5; // Default 5% reduction

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("last_triggered")]
        public DateTime? LastTriggered { get; set; }

        [Column("notification_count")]
        public int NotificationCount { get; set; } = 0;

        // Navigation properties
        public virtual User User { get; set; } = null!;
        public virtual Property Property { get; set; } = null!;
    }
}