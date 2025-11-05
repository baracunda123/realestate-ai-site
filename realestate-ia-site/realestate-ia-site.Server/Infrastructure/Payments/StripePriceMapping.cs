namespace realestate_ia_site.Server.Infrastructure.Payments;

/// <summary>
/// Mapeamento centralizado de planos para Stripe Price IDs
/// </summary>
public static class StripePriceMapping
{
    private static readonly Dictionary<string, string> PriceIds = new()
    {
        { "premium", "price_1RkjFOGbRiVruKbr4KdFaaI4" }
    };

    /// <summary>
    /// Obtém o Price ID do Stripe para um plano específico
    /// </summary>
    /// <param name="planId">ID do plano (ex: "premium")</param>
    /// <returns>Price ID do Stripe</returns>
    /// <exception cref="ArgumentException">Se o plano não existir</exception>
    public static string GetPriceId(string planId)
    {
        if (string.IsNullOrWhiteSpace(planId))
            throw new ArgumentException("Plan ID não pode ser vazio", nameof(planId));

        var normalizedPlanId = planId.ToLowerInvariant();
        
        if (!PriceIds.TryGetValue(normalizedPlanId, out var priceId))
            throw new ArgumentException($"Plano '{planId}' não encontrado. Planos disponíveis: {string.Join(", ", PriceIds.Keys)}");

        return priceId;
    }

    /// <summary>
    /// Verifica se um plano existe
    /// </summary>
    public static bool IsValidPlan(string planId)
    {
        if (string.IsNullOrWhiteSpace(planId))
            return false;

        return PriceIds.ContainsKey(planId.ToLowerInvariant());
    }

    /// <summary>
    /// Obtém todos os planos disponíveis
    /// </summary>
    public static IReadOnlyCollection<string> GetAvailablePlans() => PriceIds.Keys;
}
