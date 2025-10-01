using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace realestate_ia_site.Server.Domain.Entities
{
    [Table("property_view_history")]
    public class PropertyViewHistory
    {
        [Key]
        [Column("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("user_id")]
        [Required]
        [ForeignKey("User")]
        public string UserId { get; set; } = string.Empty;

        [Column("property_id")]
        [Required]
        [ForeignKey("Property")]
        public string PropertyId { get; set; } = string.Empty;

        [Column("viewed_at")]
        public DateTime ViewedAt { get; set; } = DateTime.UtcNow;

        [Column("view_count")]
        public int ViewCount { get; set; } = 1;

        [Column("is_hidden")]
        public bool IsHidden { get; set; } = false;

        [Column("hidden_at")]
        public DateTime? HiddenAt { get; set; }

        // Navigation properties
        public virtual User User { get; set; } = null!;
        public virtual Property Property { get; set; } = null!;
    }
}