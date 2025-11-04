using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Application.Chat.Interfaces;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Application.Payments.Interfaces;
using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Infrastructure.Chat
{
    public class ChatUsageService : IChatUsageService
    {
        private readonly IApplicationDbContext _context;
        private readonly ISubscriptionService _subscriptionService;
        private readonly ILogger<ChatUsageService> _logger;

        // Mapeamento de Stripe Price IDs para planos
        // TODO: Configurar estes IDs no appsettings.json ou variáveis de ambiente
        private readonly Dictionary<string, string> _stripePriceToPlan = new()
        {
            // Exemplo - substituir pelos IDs reais do Stripe
            ["price_basic_monthly"] = "basic",
            ["price_basic_yearly"] = "basic",
            ["price_premium_monthly"] = "premium",
            ["price_premium_yearly"] = "premium",
            ["price_unlimited_monthly"] = "unlimited",
            ["price_unlimited_yearly"] = "unlimited"
        };

        public ChatUsageService(
            IApplicationDbContext context,
            ISubscriptionService subscriptionService,
            ILogger<ChatUsageService> logger)
        {
            _context = context;
            _subscriptionService = subscriptionService;
            _logger = logger;
        }

        public async Task<bool> HasAvailableQuotaAsync(string userId, CancellationToken ct = default)
        {
            var quota = await GetOrCreateQuotaAsync(userId, ct);

            // Reset automático se expirou
            if (quota.IsExpired)
            {
                quota.ResetQuota();
                _context.ChatUsageQuotas.Update(quota);
                await _context.SaveChangesAsync(ct);
                _logger.LogInformation("Quota resetada automaticamente para usuário {UserId}", userId);
            }

            return quota.HasRemainingQuota;
        }

        public async Task<bool> ConsumePromptAsync(string userId, CancellationToken ct = default)
        {
            var quota = await GetOrCreateQuotaAsync(userId, ct);

            // Reset automático se expirou
            if (quota.IsExpired)
            {
                quota.ResetQuota();
            }

            var consumed = quota.TryConsumePrompt();

            if (consumed)
            {
                _context.ChatUsageQuotas.Update(quota);
                await _context.SaveChangesAsync(ct);

                _logger.LogInformation(
                    "Prompt consumido para usuário {UserId} - Usado: {Used}/{Max} ({Percentage:F1}%)",
                    userId, quota.UsedPrompts, quota.MaxPrompts, quota.UsagePercentage);

                // Alertar se está perto do limite
                if (quota.UsagePercentage >= 80 && quota.UsagePercentage < 100)
                {
                    _logger.LogWarning(
                        "Usuário {UserId} está próximo do limite de quota: {Used}/{Max}",
                        userId, quota.UsedPrompts, quota.MaxPrompts);
                }
            }
            else
            {
                _logger.LogWarning("Quota esgotada para usuário {UserId} - Plano: {Plan}", userId, quota.PlanType);
            }

            return consumed;
        }

        public async Task<ChatUsageQuota> GetOrCreateQuotaAsync(string userId, CancellationToken ct = default)
        {
            var quota = await _context.ChatUsageQuotas
                .FirstOrDefaultAsync(q => q.UserId == userId, ct);

            if (quota == null)
            {
                _logger.LogInformation("Criando nova quota para usuário {UserId}", userId);

                // Verificar se usuário tem subscrição ativa
                var hasSubscription = await _subscriptionService.HasActiveSubscriptionAsync(userId);
                var subscription = hasSubscription 
                    ? await _subscriptionService.GetActiveSubscriptionAsync(userId) 
                    : null;

                quota = new ChatUsageQuota
                {
                    UserId = userId,
                    PlanType = DeterminePlanType(subscription?.StripePriceId),
                    PeriodStart = DateTime.UtcNow,
                    PeriodEnd = DateTime.UtcNow.AddMonths(1),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                quota.UpdatePlan(quota.PlanType);

                _context.ChatUsageQuotas.Add(quota);
                await _context.SaveChangesAsync(ct);

                _logger.LogInformation(
                    "Quota criada para usuário {UserId} - Plano: {Plan}, Limite: {Limit}",
                    userId, quota.PlanType, quota.MaxPrompts);
            }

            return quota;
        }

        public async Task UpdateUserPlanAsync(string userId, string stripePriceId, CancellationToken ct = default)
        {
            var quota = await GetOrCreateQuotaAsync(userId, ct);
            var newPlanType = DeterminePlanType(stripePriceId);

            if (quota.PlanType != newPlanType)
            {
                var oldPlan = quota.PlanType;
                quota.UpdatePlan(newPlanType);
                _context.ChatUsageQuotas.Update(quota);
                await _context.SaveChangesAsync(ct);

                _logger.LogInformation(
                    "Plano atualizado para usuário {UserId} - {OldPlan} ? {NewPlan} (Limite: {Limit})",
                    userId, oldPlan, newPlanType, quota.MaxPrompts);
            }
        }

        public async Task ResetQuotaAsync(string userId, CancellationToken ct = default)
        {
            var quota = await GetOrCreateQuotaAsync(userId, ct);
            quota.ResetQuota();
            _context.ChatUsageQuotas.Update(quota);
            await _context.SaveChangesAsync(ct);

            _logger.LogInformation("Quota resetada manualmente para usuário {UserId}", userId);
        }

        public async Task<ChatUsageStats> GetUsageStatsAsync(string userId, CancellationToken ct = default)
        {
            var quota = await GetOrCreateQuotaAsync(userId, ct);
            var hasSubscription = await _subscriptionService.HasActiveSubscriptionAsync(userId);

            return new ChatUsageStats
            {
                UsedPrompts = quota.UsedPrompts,
                MaxPrompts = quota.MaxPrompts,
                RemainingPrompts = quota.RemainingPrompts,
                UsagePercentage = quota.UsagePercentage,
                PlanType = quota.PlanType,
                PeriodStart = quota.PeriodStart,
                PeriodEnd = quota.PeriodEnd,
                LastUsedAt = quota.LastUsedAt,
                HasActiveSubscription = hasSubscription
            };
        }

        private string DeterminePlanType(string? stripePriceId)
        {
            if (string.IsNullOrEmpty(stripePriceId))
            {
                return "free";
            }

            // Tentar encontrar plano no mapeamento
            if (_stripePriceToPlan.TryGetValue(stripePriceId, out var planType))
            {
                return planType;
            }

            // Fallback: tentar detectar pelo nome/padrão do priceId
            var priceIdLower = stripePriceId.ToLower();
            if (priceIdLower.Contains("unlimited"))
            {
                return "unlimited";
            }
            if (priceIdLower.Contains("premium"))
            {
                return "premium";
            }
            if (priceIdLower.Contains("basic"))
            {
                return "basic";
            }

            _logger.LogWarning("Stripe Price ID desconhecido: {PriceId} - usando plano 'basic'", stripePriceId);
            return "basic";
        }
    }
}
