using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace realestate_ia_site.Server.Domain.Entities
{
    /// <summary>
    /// Representa a quota de uso do chat IA para um usuário
    /// </summary>
    [Table("chat_usage_quotas")]
    public class ChatUsageQuota
    {
        [Key]
        [Column("id")]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("user_id")]
        [ForeignKey("User")]
        [Required]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Número de prompts/mensagens usados no período atual
        /// </summary>
        [Column("used_prompts")]
        public int UsedPrompts { get; set; } = 0;

        /// <summary>
        /// Limite máximo de prompts no período (baseado no plano)
        /// </summary>
        [Column("max_prompts")]
        public int MaxPrompts { get; set; } = 50; // Free tier default

        /// <summary>
        /// Tipo de plano: "free", "basic", "premium", "unlimited"
        /// </summary>
        [Column("plan_type")]
        [Required]
        public string PlanType { get; set; } = "free";

        /// <summary>
        /// Data de início do período de quota atual
        /// </summary>
        [Column("period_start")]
        public DateTime PeriodStart { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Data de fim do período de quota (reset automático)
        /// </summary>
        [Column("period_end")]
        public DateTime PeriodEnd { get; set; } = DateTime.UtcNow.AddMonths(1);

        /// <summary>
        /// Última vez que a quota foi usada
        /// </summary>
        [Column("last_used_at")]
        public DateTime? LastUsedAt { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navegação
        public virtual User? User { get; set; }

        // Métodos auxiliares
        [NotMapped]
        public int RemainingPrompts => Math.Max(0, MaxPrompts - UsedPrompts);

        [NotMapped]
        public bool HasRemainingQuota => PlanType == "unlimited" || UsedPrompts < MaxPrompts;

        [NotMapped]
        public double UsagePercentage => MaxPrompts > 0 ? (double)UsedPrompts / MaxPrompts * 100 : 0;

        [NotMapped]
        public bool IsExpired => DateTime.UtcNow >= PeriodEnd;

        /// <summary>
        /// Incrementa o uso de prompts e retorna se ainda há quota disponível
        /// </summary>
        public bool TryConsumePrompt()
        {
            if (IsExpired)
            {
                ResetQuota();
            }

            if (!HasRemainingQuota)
            {
                return false;
            }

            if (PlanType != "unlimited")
            {
                UsedPrompts++;
            }

            LastUsedAt = DateTime.UtcNow;
            UpdatedAt = DateTime.UtcNow;
            return true;
        }

        /// <summary>
        /// Reseta a quota para um novo período
        /// </summary>
        public void ResetQuota()
        {
            UsedPrompts = 0;
            PeriodStart = DateTime.UtcNow;
            PeriodEnd = DateTime.UtcNow.AddMonths(1);
            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Atualiza o plano e ajusta limites
        /// </summary>
        public void UpdatePlan(string planType)
        {
            PlanType = planType.ToLower();
            MaxPrompts = planType.ToLower() switch
            {
                "free" => 50,
                "basic" => 500,
                "premium" => 2000,
                "unlimited" => int.MaxValue,
                _ => 50
            };
            UpdatedAt = DateTime.UtcNow;
        }
    }
}
