using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Filters
{
    public class RoomsFilter : IPropertyFilter
    {
        private readonly ILogger<RoomsFilter> _logger;

        public RoomsFilter(ILogger<RoomsFilter> logger)
        {
            _logger = logger;
        }

        public bool CanHandle(string filterKey) => filterKey == "rooms" || filterKey == "bedrooms";

        public string GetFilterName() => "RoomsFilter";

        public Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            // Suporte para "rooms" (usado pelo OpenAI)
            if (filters.ContainsKey("rooms") && filters["rooms"] != null)
            {
                if (int.TryParse(filters["rooms"].ToString(), out var rooms))
                {
                    query = query.Where(p => p.Bedrooms >= rooms);
                    _logger.LogDebug("Filtro 'rooms' aplicado: {Rooms}+ quartos", rooms);
                }
                else
                {
                    _logger.LogWarning("Valor inválido para 'rooms': {Value}", filters["rooms"]);
                }
            }

            // Suporte para "bedrooms" (se necessário)
            if (filters.ContainsKey("bedrooms") && filters["bedrooms"] != null)
            {
                if (int.TryParse(filters["bedrooms"].ToString(), out var bedrooms))
                {
                    query = query.Where(p => p.Bedrooms >= bedrooms);
                    _logger.LogDebug("Filtro 'bedrooms' aplicado: {Bedrooms}+ quartos", bedrooms);
                }
                else
                {
                    _logger.LogWarning("Valor inválido para 'bedrooms': {Value}", filters["bedrooms"]);
                }
            }

            return Task.FromResult(query);
        }
    }
}