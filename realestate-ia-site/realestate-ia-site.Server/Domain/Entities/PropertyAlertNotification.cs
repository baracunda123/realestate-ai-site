using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace realestate_ia_site.Server.Domain.Entities
{
    [Table("property_alert_notifications")]
    public class PropertyAlertNotification
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
        [Column("alert_id")]
        public required Guid AlertId { get; set; }

        [Column("alert_type")]
        [MaxLength(50)]
        public required string AlertType { get; set; } // "new_listing", "price_drop"

        [Column("title")]
        [MaxLength(500)]
        public required string Title { get; set; }

        [Column("message")]
        [MaxLength(1000)]
        public required string Message { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("read_at")]
        public DateTime? ReadAt { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        // Dados adicionais para contexto
        [Column("property_price")]
        public decimal? PropertyPrice { get; set; }

        [Column("old_price")]
        public decimal? OldPrice { get; set; }

        [Column("property_location")]
        [MaxLength(300)]
        public string? PropertyLocation { get; set; }

        // Navegação
        public virtual Property Property { get; set; } = null!;
        public virtual User User { get; set; } = null!;
    }
}