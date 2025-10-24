using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.PropertySearch.Filters;
using Microsoft.EntityFrameworkCore;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Filters
{
    /// <summary>
    /// Filtro inteligente que ordena propriedades por proximidade a um preço-alvo.
    /// Diferente de min_price/max_price (que são limites rígidos), este filtro:
    /// - Procura PRIMEIRO os mais próximos do valor alvo
    /// - Expande automaticamente se não houver resultados suficientes
    /// - Traz tanto valores abaixo quanto acima do alvo
    /// </summary>
    public class TargetPriceFilter : IPropertyFilter
    {
        private readonly ILogger<TargetPriceFilter> _logger;
        
        public TargetPriceFilter(ILogger<TargetPriceFilter> logger) => _logger = logger;
        
        public bool CanHandle(string filterKey) => filterKey == "target_price";
        
        public string GetFilterName() => nameof(TargetPriceFilter);
        
        public Task<IQueryable<Property>> ApplyAsync(
            IQueryable<Property> query, 
            Dictionary<string, object> filters, 
            CancellationToken cancellationToken = default)
        {
            if (!filters.TryGetValue("target_price", out var targetObj) || targetObj == null)
                return Task.FromResult(query);

            if (!decimal.TryParse(targetObj.ToString(), out var targetPrice))
                return Task.FromResult(query);

            _logger.LogInformation("[TargetPriceFilter] Ordenando por proximidade ao preço-alvo: {TargetPrice:C}", targetPrice);

            // Ordena por proximidade ao preço-alvo usando ABS(Price - Target)
            // Propriedades sem preço vão para o fim
            query = query
                .OrderBy(p => p.Price.HasValue ? 0 : 1)  // Propriedades com preço primeiro
                .ThenBy(p => p.Price.HasValue 
                    ? Math.Abs(p.Price.Value - targetPrice)  // Ordena pela distância ao alvo
                    : decimal.MaxValue);                      // Sem preço vai para o fim

            _logger.LogDebug("[TargetPriceFilter] Query ordenada por proximidade ao preço {Target:C}", targetPrice);
            
            return Task.FromResult(query);
        }
    }
}

