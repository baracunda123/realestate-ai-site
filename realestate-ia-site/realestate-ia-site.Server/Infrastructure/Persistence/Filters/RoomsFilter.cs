using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.PropertySearch.Filters;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Filters
{
    public class RoomsFilter : IPropertyFilter
    {
        private readonly ILogger<RoomsFilter> _logger;
        public RoomsFilter(ILogger<RoomsFilter> logger) => _logger = logger;
        public bool CanHandle(string filterKey) => filterKey is "rooms" or "bedrooms";
        public string GetFilterName() => nameof(RoomsFilter);
        public Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            if (filters.TryGetValue("rooms", out var roomsObj) && int.TryParse(roomsObj?.ToString(), out var rooms))
            {
                query = query.Where(p => p.Bedrooms >= rooms);
                _logger.LogDebug("[SearchFilter] rooms>={Rooms}", rooms);
            }
            if (filters.TryGetValue("bedrooms", out var bedroomsObj) && int.TryParse(bedroomsObj?.ToString(), out var bedrooms))
            {
                query = query.Where(p => p.Bedrooms >= bedrooms);
                _logger.LogDebug("[SearchFilter] bedrooms>={Bedrooms}", bedrooms);
            }
            return Task.FromResult(query);
        }
    }
}