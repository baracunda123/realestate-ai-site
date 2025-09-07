using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace realestate_ia_site.Server.Domain.Entities
{
    [Table("webhook_events")]
    public class WebhookEvent
    {
        [Column("id")]
        [Key]
        public string Id { get; set; } = string.Empty;
        
        [Column("event_type")]
        [Required]
        public string EventType { get; set; } = string.Empty;

        [Column("type")]
        [Required]
        public string Type { get; set; } = string.Empty;
        
        [Column("stripe_event_id")]
        public string? StripeEventId { get; set; }
        
        [Column("data", TypeName = "jsonb")]
        public JsonDocument? Data { get; set; }
        
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
        
        [Column("modified_at")]
        public DateTime ModifiedAt { get; set; }
    }
} 