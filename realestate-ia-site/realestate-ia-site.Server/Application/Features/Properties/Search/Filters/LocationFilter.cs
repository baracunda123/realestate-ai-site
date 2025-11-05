using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Infrastructure.AI;
using realestate_ia_site.Server.Application.Features.Properties.Search.Filters;

namespace realestate_ia_site.Server.Application.Features.Properties.Search.Filters
{
    public class LocationFilter : IPropertyFilter
    {
        private readonly LocationAIService _locationAI;
        private readonly ILogger<LocationFilter> _logger;
        public LocationFilter(LocationAIService locationAI, ILogger<LocationFilter> logger)
        { _locationAI = locationAI; _logger = logger; }
        public bool CanHandle(string filterKey) => filterKey == "location";
        public string GetFilterName() => nameof(LocationFilter);
        public async Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            if (!filters.TryGetValue("location", out var value) || value == null) return query;
            var location = value.ToString();
            if (string.IsNullOrWhiteSpace(location)) return query;
            var (locationQuery, searchType) = await ApplyLocationFilterWithAI(query, location, cancellationToken);
            _logger.LogDebug("[SearchFilter] location={Location} mode={Mode}", location, searchType);
            return locationQuery;
        }
        private async Task<(IQueryable<Property>, string)> ApplyLocationFilterWithAI(IQueryable<Property> query, string location, CancellationToken ct)
        {
            var lowered = location.ToLower();
            var exactQuery = query.Where(p =>
                (p.City != null && p.City.ToLower().Contains(lowered)) ||
                (p.State != null && p.State.ToLower().Contains(lowered)) ||
                (p.County != null && p.County.ToLower().Contains(lowered)) ||
                (p.CivilParish != null && p.CivilParish.ToLower().Contains(lowered)));
            var exactCount = await exactQuery.CountAsync(ct);
            if (exactCount > 0) return (exactQuery, "exact_match");
            var expandedLocations = await _locationAI.GetNearbyLocationsAsync(location, ct);
            if (expandedLocations.Any())
            {
                var expandedLower = expandedLocations.Select(l => l.ToLower()).ToList();
                var expandedQuery = query.Where(p => expandedLower.Any(el =>
                    (p.City != null && p.City.ToLower().Contains(el)) ||
                    (p.State != null && p.State.ToLower().Contains(el)) ||
                    (p.County != null && p.County.ToLower().Contains(el)) ||
                    (p.CivilParish != null && p.CivilParish.ToLower().Contains(el))));
                return (expandedQuery, "ai_expanded");
            }
            return (exactQuery, "no_match");
        }
    }
}
