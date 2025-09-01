using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Filters
{
    public class SortFilter : IPropertyFilter
    {
        private readonly ILogger<SortFilter> _logger;

        public SortFilter(ILogger<SortFilter> logger)
        {
            _logger = logger;
        }

        public bool CanHandle(string filterKey) => filterKey == "sort" || filterKey == "cheaper_hint";

        public string GetFilterName() => "SortFilter";

        public Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            // Log do cheaper_hint se existir
            if (filters.ContainsKey("cheaper_hint") && filters["cheaper_hint"] != null)
            {
                var cheaperHint = filters["cheaper_hint"].ToString();
                _logger.LogDebug("Hint de preço mais barato: {CheaperHint}", cheaperHint);
            }

            // Aplicar ordenação
            if (filters.ContainsKey("sort") && filters["sort"] != null)
            {
                var sortType = filters["sort"].ToString();
                var sortedQuery = sortType switch
                {
                    "price_asc" => query.OrderBy(p => p.Price ?? decimal.MaxValue),
                    "price_desc" => query.OrderByDescending(p => p.Price ?? 0),
                    "area_desc" => query.OrderByDescending(p => p.Area ?? 0),
                    "area_asc" => query.OrderBy(p => p.Area ?? double.MaxValue),
                    "newest" => query.OrderByDescending(p => p.CreatedAt),
                    "oldest" => query.OrderBy(p => p.CreatedAt),
                    _ => query // "relevance" ou outros - manter ordem padrão
                };

                _logger.LogDebug("Ordenação aplicada: {SortType}", sortType);
                return Task.FromResult(sortedQuery);
            }

            return Task.FromResult(query);
        }
    }
}