using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Filters
{
    public class PriceFilter : IPropertyFilter
    {
        private readonly ILogger<PriceFilter> _logger;

        public PriceFilter(ILogger<PriceFilter> logger)
        {
            _logger = logger;
        }

        public bool CanHandle(string filterKey) => filterKey == "max_price" || filterKey == "min_price";

        public string GetFilterName() => "PriceFilter";

        public Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            // Aplicar filtro de preço máximo
            if (filters.ContainsKey("max_price") && filters["max_price"] != null)
            {
                if (decimal.TryParse(filters["max_price"].ToString(), out var maxPrice))
                {
                    query = query.Where(p => p.Price <= maxPrice);
                    _logger.LogDebug("Filtro 'max_price' aplicado: {MaxPrice:C}", maxPrice);
                }
                else
                {
                    _logger.LogWarning("Valor inválido para 'max_price': {Value}", filters["max_price"]);
                }
            }

            // Aplicar filtro de preço mínimo (se necessário no futuro)
            if (filters.ContainsKey("min_price") && filters["min_price"] != null)
            {
                if (decimal.TryParse(filters["min_price"].ToString(), out var minPrice))
                {
                    query = query.Where(p => p.Price >= minPrice);
                    _logger.LogDebug("Filtro 'min_price' aplicado: {MinPrice:C}", minPrice);
                }
                else
                {
                    _logger.LogWarning("Valor inválido para 'min_price': {Value}", filters["min_price"]);
                }
            }

            return Task.FromResult(query);
        }
    }
}