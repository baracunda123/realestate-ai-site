using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Filters
{
    public class TopPicksFilter : IPropertyFilter
    {
        private readonly ILogger<TopPicksFilter> _logger;

        public TopPicksFilter(ILogger<TopPicksFilter> logger)
        {
            _logger = logger;
        }

        public bool CanHandle(string filterKey) => filterKey == "generate_top_picks";

        public string GetFilterName() => "TopPicksFilter";

        public Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            if (!filters.ContainsKey("generate_top_picks") || filters["generate_top_picks"]?.ToString() != "true")
                return Task.FromResult(query);

            // Aplicar scoring heurístico para Top Picks
            var scoredQuery = query
                .Where(p => p.Price != null && p.Price > 0) // Propriedades com preços válidos
                .Where(p => !string.IsNullOrEmpty(p.ImageUrl)) // Com imagens
                .OrderByDescending(p => CalculateHeuristicScore(p, filters))
                .Take(5); // Top 5 picks

            _logger.LogDebug("Top Picks aplicado com scoring heurístico");
            return Task.FromResult(scoredQuery);
        }

        private double CalculateHeuristicScore(Property property, Dictionary<string, object> filters)
        {
            double score = 0;

            // 1. Score base por qualidade dos dados
            if (!string.IsNullOrEmpty(property.ImageUrl)) score += 10;
            if (property.Bedrooms > 0) score += 5;
            if (property.Area > 0) score += 5;

            // 2. Score por correspondência com filtros de preço
            if (filters.ContainsKey("max_price") && decimal.TryParse(filters["max_price"].ToString(), out var maxPrice) && property.Price.HasValue)
            {
                var priceRatio = (double)(maxPrice - property.Price.Value) / (double)maxPrice;
                score += Math.Max(0, priceRatio * 20); // Bonus por estar abaixo do orçamento
            }

            // 3. Score por tipo de propriedade popular
            if (property.Type?.ToLower().Contains("apartamento") == true) score += 5;
            if (property.Type?.ToLower().Contains("moradia") == true) score += 8;

            // 4. Score por número de quartos (balanced)
            if (property.Bedrooms >= 2 && property.Bedrooms <= 4) score += 10;

            // 5. Score por garagem
            if (property.Garage) score += 8;

            // 6. Score por área adequada
            if (property.Area >= 80 && property.Area <= 200) score += 10;

            // 7. Penalizar preços muito altos ou muito baixos (outliers)
            if (property.Price < 50000 || property.Price > 1000000) score -= 10;

            // 8. Bonus por propriedades recentes
            var daysSinceCreated = (DateTime.UtcNow - property.CreatedAt).TotalDays;
            if (daysSinceCreated <= 30) score += 5; // Propriedades recentes

            return score;
        }
    }
}