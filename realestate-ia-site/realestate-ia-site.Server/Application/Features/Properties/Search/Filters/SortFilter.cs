using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Application.Features.Properties.Search.Filters
{
    public class SortFilter : IPropertyFilter
    {
        private readonly ILogger<SortFilter> _logger;
        public SortFilter(ILogger<SortFilter> logger) => _logger = logger;
        public bool CanHandle(string filterKey) => filterKey == "sort";
        public string GetFilterName() => nameof(SortFilter);
        public Task<PropertyFilterResult> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            if (!filters.TryGetValue("sort", out var sortObj) || sortObj == null) return Task.FromResult(new PropertyFilterResult(query));
            var sort = sortObj.ToString();
            query = sort switch
            {
                "price_asc" => query.OrderBy(p => p.Price),
                "price_desc" => query.OrderByDescending(p => p.Price),
                "newest" => query.OrderByDescending(p => p.CreatedAt),
                _ => query
            };
            _logger.LogDebug("[SearchFilter] sort={Sort}", sort);
            return Task.FromResult(new PropertyFilterResult(query));
        }
    }
}
