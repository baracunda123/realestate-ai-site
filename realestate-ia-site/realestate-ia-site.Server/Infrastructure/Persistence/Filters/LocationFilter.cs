using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Infrastructure.AI;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Filters
{
    public class LocationFilter : IPropertyFilter
    {
        private readonly LocationAIService _locationAI;
        private readonly ILogger<LocationFilter> _logger;

        public LocationFilter(LocationAIService locationAI, ILogger<LocationFilter> logger)
        {
            _locationAI = locationAI;
            _logger = logger;   
        }

        public bool CanHandle(string filterKey) => filterKey == "location";

        public string GetFilterName() => "LocationFilter";

        public async Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            if (!filters.ContainsKey("location") || filters["location"] == null)
                return query;

            var location = filters["location"].ToString();
            var (locationQuery, searchType) = await ApplyLocationFilterWithAI(query, location, cancellationToken);
            
            _logger.LogDebug("Filtro 'location' aplicado com IA: {Location} -> {SearchType}", location, searchType);
            return locationQuery;
        }

        private async Task<(IQueryable<Property>, string)> ApplyLocationFilterWithAI(IQueryable<Property> query, string location, CancellationToken cancellationToken = default)
        {
            // 1. Primeiro tentar busca exata
            var exactQuery = query.Where(p => p.City != null && p.City.ToLower().Contains(location.ToLower())
                                           || p.State != null && p.State.ToLower().Contains(location.ToLower())
                                           || p.County != null && p.County.ToLower().Contains(location.ToLower())
                                           || p.CivilParish != null && p.CivilParish.ToLower().Contains(location.ToLower()));

            var exactCount = await exactQuery.CountAsync(cancellationToken);

            if (exactCount > 0)
            {
                _logger.LogDebug("Encontrados {Count} resultados com correspondência exata para: {Location}", exactCount, location);
                return (exactQuery, "exact_match");
            }

            // 2. Se não há resultados exatos, usar IA para expandir busca
            _logger.LogDebug("Nenhum resultado exato encontrado para: {Location}. Usando IA para encontrar localizações próximas...", location);

            var expandedLocations = await _locationAI.GetNearbyLocationsAsync(location, cancellationToken);

            if (expandedLocations.Any())
            {
                var expandedQuery = query.Where(p => expandedLocations.Any(expandedLoc =>
                    p.City != null && p.City.ToLower().Contains(expandedLoc.ToLower()) ||
                    p.State != null && p.State.ToLower().Contains(expandedLoc.ToLower()) ||
                    p.County != null && p.County.ToLower().Contains(expandedLoc.ToLower()) ||
                    p.CivilParish != null && p.CivilParish.ToLower().Contains(expandedLoc.ToLower())));

                var expandedCount = await expandedQuery.CountAsync(cancellationToken);
                _logger.LogDebug("Encontrados {Count} resultados com localizações expandidas: {ExpandedLocations}",
                    expandedCount, string.Join(", ", expandedLocations));

                return (expandedQuery, $"ai_expanded: {string.Join(", ", expandedLocations)}");
            }

            // 3. Se a IA não encontrou nada, retornar busca original
            _logger.LogDebug("IA não conseguiu expandir a localização: {Location}", location);
            return (exactQuery, "no_expansion");
        }
    }
}