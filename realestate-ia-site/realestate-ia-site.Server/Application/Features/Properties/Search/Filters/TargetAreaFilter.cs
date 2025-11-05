using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Features.Properties.Search.Filters;

namespace realestate_ia_site.Server.Application.Features.Properties.Search.Filters
{
    /// <summary>
    /// Filtro inteligente que ordena propriedades por proximidade a uma área-alvo.
    /// Diferente de min_area/max_area (que são limites rígidos), este filtro:
    /// - Procura PRIMEIRO as mais próximas da área alvo
    /// - Expande automaticamente se não houver resultados suficientes
    /// - Traz tanto áreas menores quanto maiores do alvo
    /// </summary>
    public class TargetAreaFilter : IPropertyFilter
    {
        private readonly ILogger<TargetAreaFilter> _logger;
        
        public TargetAreaFilter(ILogger<TargetAreaFilter> logger) => _logger = logger;
        
        public bool CanHandle(string filterKey) => filterKey == "target_area";
        
        public string GetFilterName() => nameof(TargetAreaFilter);
        
        public Task<IQueryable<Property>> ApplyAsync(
            IQueryable<Property> query, 
            Dictionary<string, object> filters, 
            CancellationToken cancellationToken = default)
        {
            if (!filters.TryGetValue("target_area", out var targetObj) || targetObj == null)
                return Task.FromResult(query);

            if (!double.TryParse(targetObj.ToString(), out var targetArea))
                return Task.FromResult(query);

            _logger.LogInformation("[TargetAreaFilter] Ordenando por proximidade à área-alvo: {TargetArea}m²", targetArea);

            // Ordena por proximidade à área-alvo usando ABS(Area - Target)
            // Propriedades sem área vão para o fim
            query = query
                .OrderBy(p => p.Area.HasValue ? 0 : 1)  // Propriedades com área primeiro
                .ThenBy(p => p.Area.HasValue 
                    ? Math.Abs(p.Area.Value - targetArea)  // Ordena pela distância ao alvo
                    : double.MaxValue);                    // Sem área vai para o fim

            _logger.LogDebug("[TargetAreaFilter] Query ordenada por proximidade à área {Target}m²", targetArea);
            
            return Task.FromResult(query);
        }
    }
}

