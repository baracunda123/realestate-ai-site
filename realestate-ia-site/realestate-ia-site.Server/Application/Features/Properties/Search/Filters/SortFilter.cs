using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Features.Properties.Search.Filters;
using Microsoft.Extensions.Logging;

namespace realestate_ia_site.Server.Application.Features.Properties.Search.Filters
{
    public class SortFilter : IPropertyFilter
    {
        private readonly ILogger<SortFilter> _logger;
        public SortFilter(ILogger<SortFilter> logger) => _logger = logger;
        public bool CanHandle(string filterKey) => filterKey == "sort";
        public string GetFilterName() => nameof(SortFilter);
        public Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            if (!filters.TryGetValue("sort", out var sortObj) || sortObj == null) return Task.FromResult(query);
            var sort = sortObj.ToString();
            query = sort switch
            {
                "price_asc" => query.OrderBy(p => p.Price),
                "price_desc" => query.OrderByDescending(p => p.Price),
                "newest" => query.OrderByDescending(p => p.CreatedAt),
                _ => query
            };
            _logger.LogDebug("[SearchFilter] sort={Sort}", sort);
            return Task.FromResult(query);
        }
    }
}
