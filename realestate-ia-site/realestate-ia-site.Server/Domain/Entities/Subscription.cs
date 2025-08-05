using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace realestate_ia_site.Server.Domain.Entities
{
    [Table("subscriptions")]
    public class Subscription
    {
        [Key]
        public string Id { get; set; } = string.Empty;
        
        [Column("user_id")]
        [ForeignKey("User")]
        public string? UserId { get; set; }
        
        [Column("stripe_id")]
        public string? StripeId { get; set; }
        
        [Column("price_id")]
        public string? PriceId { get; set; }
        
        [Column("stripe_price_id")]
        public string? StripePriceId { get; set; }
        
        public string? Currency { get; set; }
        public string? Interval { get; set; }
        public string? Status { get; set; }
        
        [Column("current_period_start")]
        public long? CurrentPeriodStart { get; set; }
        
        [Column("current_period_end")]
        public long? CurrentPeriodEnd { get; set; }
        
        [Column("cancel_at_period_end")]
        public bool? CancelAtPeriodEnd { get; set; }
        
        public long? Amount { get; set; }
        
        [Column("started_at")]
        public long? StartedAt { get; set; }
        
        [Column("ends_at")]
        public long? EndsAt { get; set; }
        
        [Column("ended_at")]
        public long? EndedAt { get; set; }
        
        [Column("canceled_at")]
        public long? CanceledAt { get; set; }
        
        [Column("customer_cancellation_reason")]
        public string? CustomerCancellationReason { get; set; }
        
        [Column("customer_cancellation_comment")]
        public string? CustomerCancellationComment { get; set; }
        
        [Column("metadata", TypeName = "jsonb")]
        public JsonDocument? Metadata { get; set; }
        
        [Column("custom_field_data", TypeName = "jsonb")]
        public JsonDocument? CustomFieldData { get; set; }
        
        [Column("customer_id")]
        public string? CustomerId { get; set; }
        
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
        
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }

        public virtual User? User { get; set; }
    }
} 