namespace realestate_ia_site.Server.Infrastructure.Payments;

/// <summary>
/// Mapeamento centralizado de planos para Stripe Price IDs
/// Suporta ambientes DEV e PROD
/// </summary>
public static class StripePriceMapping
{
    // Price IDs de DESENVOLVIMENTO
    private static readonly Dictionary<string, string> DevPriceIds = new()
    {
        { "premium", "price_1RkjFOGbRiVruKbr4KdFaaI4" }
    };
    
    // Price IDs de PRODUÇÃO
    private static readonly Dictionary<string, string> ProdPriceIds = new()
    {
        { "premium", "price_1STQOYGvu4GjpjSqw2JXw7gW" }
    };
    
    // Seleciona o dicionário correto baseado no ambiente
    private static Dictionary<string, string> PriceIds => 
        Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Production" 
            ? ProdPriceIds 
            : DevPriceIds;
    
    // Mapeamento reverso (Price ID -> Plan)
    private static Dictionary<string, string> PriceIdToPlan => PriceIds.ToDictionary(kvp => kvp.Value, kvp => kvp.Key);

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
    
    /// <summary>
    /// Obtém o plano a partir do Price ID do Stripe
    /// </summary>
    /// <param name="priceId">Price ID do Stripe</param>
    /// <returns>Nome do plano ou null se não encontrado</returns>
    public static string? GetPlanFromPriceId(string priceId)
    {
        if (string.IsNullOrWhiteSpace(priceId))
            return null;
            
        return PriceIdToPlan.TryGetValue(priceId, out var plan) ? plan : null;
    }
}
