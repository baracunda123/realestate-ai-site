using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace realestate_ia_site.Server.Domain.Entities
{
    [Table("property_recommendations")]
    public class PropertyRecommendation
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

        [Column("score")]
        public int Score { get; set; } // 0-100

        [Column("reason")]
        [MaxLength(50)]
        public required string Reason { get; set; } // "nova_propriedade", "reducao_preco", "similar_favorito", "similar_pesquisa"

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [Column("viewed_at")]
        public DateTime? ViewedAt { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        // Navegação
        public virtual Property Property { get; set; } = null!;
        public virtual User User { get; set; } = null!;
    }
}