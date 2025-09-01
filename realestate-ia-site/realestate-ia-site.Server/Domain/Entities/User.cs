using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace realestate_ia_site.Server.Domain.Entities
{
    [Table("users")]
    public class User
    {
        [Key]
        public string Id { get; set; } = string.Empty;
        
        [Column("avatar_url")]
        public string? AvatarUrl { get; set; }
        
        [Column("user_id")]
        public string? UserId { get; set; }
        
        [Column("token_identifier")]
        [Required]
        public string TokenIdentifier { get; set; } = string.Empty;
        
        public string? Subscription { get; set; }
        public string? Credits { get; set; }
        public string? Image { get; set; }
        
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
        
        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
        
        public string? Email { get; set; }
        public string? Name { get; set; }
        
        [Column("full_name")]
        public string? FullName { get; set; }

        public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    }
} 