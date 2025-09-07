using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.PropertySearch.Filters;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Filters
{
    public class PriceFilter : IPropertyFilter
    {
        private readonly ILogger<PriceFilter> _logger;
        public PriceFilter(ILogger<PriceFilter> logger) => _logger = logger;
        public bool CanHandle(string filterKey) => filterKey is "max_price" or "min_price" or "price";
        public string GetFilterName() => nameof(PriceFilter);
        public Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            if (filters.TryGetValue("max_price", out var maxObj) && decimal.TryParse(maxObj?.ToString(), out var max))
            {
                query = query.Where(p => !p.Price.HasValue || p.Price.Value <= max);
                _logger.LogDebug("[SearchFilter] max_price<={Max}", max);
            }
            if (filters.TryGetValue("min_price", out var minObj) && decimal.TryParse(minObj?.ToString(), out var min))
            {
                query = query.Where(p => p.Price.HasValue && p.Price.Value >= min);
                _logger.LogDebug("[SearchFilter] min_price>={Min}", min);
            }
            return Task.FromResult(query);
        }
    }
}