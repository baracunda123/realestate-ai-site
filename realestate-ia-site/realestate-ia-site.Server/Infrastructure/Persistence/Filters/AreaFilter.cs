using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.PropertySearch.Filters;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Filters
{
    /// <summary>
    /// Filtro para limites rígidos de área (min_area, max_area).
    /// Exclui propriedades fora dos limites definidos.
    /// </summary>
    public class AreaFilter : IPropertyFilter
    {
        private readonly ILogger<AreaFilter> _logger;
        
        public AreaFilter(ILogger<AreaFilter> logger) => _logger = logger;
        
        public bool CanHandle(string filterKey) => filterKey is "min_area" or "max_area" or "area";
        
        public string GetFilterName() => nameof(AreaFilter);
        
        public Task<IQueryable<Property>> ApplyAsync(
            IQueryable<Property> query, 
            Dictionary<string, object> filters, 
            CancellationToken cancellationToken = default)
        {
            if (filters.TryGetValue("max_area", out var maxObj) && double.TryParse(maxObj?.ToString(), out var max))
            {
                query = query.Where(p => !p.Area.HasValue || p.Area.Value <= max);
                _logger.LogDebug("[SearchFilter] max_area<={Max}m²", max);
            }
            
            if (filters.TryGetValue("min_area", out var minObj) && double.TryParse(minObj?.ToString(), out var min))
            {
                query = query.Where(p => p.Area.HasValue && p.Area.Value >= min);
                _logger.LogDebug("[SearchFilter] min_area>={Min}m²", min);
            }
            
            return Task.FromResult(query);
        }
    }
}

