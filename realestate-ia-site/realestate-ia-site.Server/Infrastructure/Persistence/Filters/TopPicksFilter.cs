using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.PropertySearch.Filters;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Filters
{
    public class TopPicksFilter : IPropertyFilter
    {
        private readonly ILogger<TopPicksFilter> _logger;
        public TopPicksFilter(ILogger<TopPicksFilter> logger) => _logger = logger;
        public bool CanHandle(string filterKey) => filterKey == "top";
        public string GetFilterName() => nameof(TopPicksFilter);
        public Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            if (!filters.TryGetValue("top", out var topObj) || topObj == null) return Task.FromResult(query);
            if (int.TryParse(topObj.ToString(), out var top) && top > 0)
            {
                query = query.OrderByDescending(p => p.CreatedAt).Take(top);
                _logger.LogDebug("[SearchFilter] top={Top}", top);
            }
            return Task.FromResult(query);
        }
    }
}