using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Application.Chat.Interfaces
{
    public interface IChatUsageService
    {
        /// <summary>
        /// Verifica se o usuário tem quota disponível para usar o chat
        /// </summary>
        Task<bool> HasAvailableQuotaAsync(string userId, CancellationToken ct = default);

        /// <summary>
        /// Consome uma unidade de quota (um prompt) para o usuário
        /// </summary>
        Task<bool> ConsumePromptAsync(string userId, CancellationToken ct = default);

        /// <summary>
        /// Obtém a quota atual do usuário
        /// </summary>
        Task<ChatUsageQuota> GetOrCreateQuotaAsync(string userId, CancellationToken ct = default);

        /// <summary>
        /// Atualiza o plano do usuário com base na subscrição Stripe
        /// </summary>
        Task UpdateUserPlanAsync(string userId, string stripePriceId, CancellationToken ct = default);

        /// <summary>
        /// Reseta a quota do usuário (administrativo ou manual)
        /// </summary>
        Task ResetQuotaAsync(string userId, CancellationToken ct = default);

        /// <summary>
        /// Obtém estatísticas de uso do usuário
        /// </summary>
        Task<ChatUsageStats> GetUsageStatsAsync(string userId, CancellationToken ct = default);
    }

    public record ChatUsageStats
    {
        public int UsedPrompts { get; init; }
        public int MaxPrompts { get; init; }
        public int RemainingPrompts { get; init; }
        public double UsagePercentage { get; init; }
        public string PlanType { get; init; } = "free";
        public DateTime PeriodStart { get; init; }
        public DateTime PeriodEnd { get; init; }
        public DateTime? LastUsedAt { get; init; }
        public bool HasActiveSubscription { get; init; }
    }
}
