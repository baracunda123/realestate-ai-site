using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Features.Properties.Search.Filters;

namespace realestate_ia_site.Server.Application.Features.Properties.Search.Filters
{
    public class RoomsFilter : IPropertyFilter
    {
        private readonly ILogger<RoomsFilter> _logger;
        public RoomsFilter(ILogger<RoomsFilter> logger) => _logger = logger;
        public bool CanHandle(string filterKey) => filterKey is "rooms" or "bedrooms" or "min_rooms" or "max_rooms";
        public string GetFilterName() => nameof(RoomsFilter);
        public Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            // EXATO: "T2" ou "2 quartos" → rooms == 2
            if (filters.TryGetValue("rooms", out var roomsObj) && int.TryParse(roomsObj?.ToString(), out var rooms))
            {
                query = query.Where(p => p.Bedrooms == rooms);
                _logger.LogDebug("[SearchFilter] rooms=={Rooms} (exato)", rooms);
            }
            
            // MÍNIMO: "pelo menos 2 quartos" ou "T2 ou mais" → min_rooms >= 2
            if (filters.TryGetValue("min_rooms", out var minRoomsObj) && int.TryParse(minRoomsObj?.ToString(), out var minRooms))
            {
                query = query.Where(p => p.Bedrooms >= minRooms);
                _logger.LogDebug("[SearchFilter] rooms>={MinRooms} (mínimo)", minRooms);
            }
            
            // MÁXIMO: "até 2 quartos" ou "no máximo T2" → max_rooms <= 2
            if (filters.TryGetValue("max_rooms", out var maxRoomsObj) && int.TryParse(maxRoomsObj?.ToString(), out var maxRooms))
            {
                query = query.Where(p => p.Bedrooms <= maxRooms);
                _logger.LogDebug("[SearchFilter] rooms<={MaxRooms} (máximo)", maxRooms);
            }
            
            // LEGACY: bedrooms (mantém compatibilidade - comporta-se como exato)
            if (filters.TryGetValue("bedrooms", out var bedroomsObj) && int.TryParse(bedroomsObj?.ToString(), out var bedrooms))
            {
                query = query.Where(p => p.Bedrooms == bedrooms);
                _logger.LogDebug("[SearchFilter] bedrooms=={Bedrooms} (exato - legacy)", bedrooms);
            }
            
            return Task.FromResult(query);
        }
    }
}
