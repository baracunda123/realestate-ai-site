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
        public bool CanHandle(string filterKey) => filterKey == "location" || filterKey == "locations";
        public string GetFilterName() => nameof(LocationFilter);
        public async Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            // Suporte para múltiplas localizações (ranges geográficos)
            if (filters.TryGetValue("locations", out var locationsValue) && locationsValue != null)
            {
                var locations = locationsValue switch
                {
                    List<string> list => list,
                    List<object> objList => objList.Select(o => o?.ToString() ?? "").Where(s => !string.IsNullOrWhiteSpace(s)).ToList(),
                    string str => str.Split(',').Select(s => s.Trim()).Where(s => !string.IsNullOrWhiteSpace(s)).ToList(),
                    _ => new List<string>()
                };

                if (locations.Any())
                {
                    // Verificar se há location_type (between ou specific)
                    var locationType = "specific"; // default
                    if (filters.TryGetValue("location_type", out var typeValue) && typeValue != null)
                    {
                        locationType = typeValue.ToString()?.ToLower() ?? "specific";
                    }

                    var (locationQuery, searchType) = await ApplyMultipleLocationsFilterWithAI(query, locations, locationType, cancellationToken);
                    _logger.LogDebug("[SearchFilter] locations={Locations} type={Type} mode={Mode}", 
                        string.Join(", ", locations), locationType, searchType);
                    return locationQuery;
                }
            }

            // Suporte para localização única (legacy)
            if (filters.TryGetValue("location", out var value) && value != null)
            {
                var location = value.ToString();
                if (!string.IsNullOrWhiteSpace(location))
                {
                    var (locationQuery, searchType) = await ApplyLocationFilterWithAI(query, location, cancellationToken);
                    _logger.LogDebug("[SearchFilter] location={Location} mode={Mode}", location, searchType);
                    return locationQuery;
                }
            }

            return query;
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

        private async Task<(IQueryable<Property>, string)> ApplyMultipleLocationsFilterWithAI(IQueryable<Property> query, List<string> locations, string locationType, CancellationToken ct)
        {
            // Se location_type é "specific", procurar APENAS nas localizações mencionadas (não expandir)
            // Se location_type é "between", expandir para área geográfica entre as localizações
            
            if (locationType == "specific")
            {
                // Localizações específicas: NUNCA expandir, procurar apenas nas localizações mencionadas
                // O scoring vai decidir quais são os melhores resultados dessas localizações
                _logger.LogInformation("[LocationFilter] Localizações específicas (sem expansão): {Locations}", 
                    string.Join(", ", locations));
                
                var locationsLower = locations.Select(l => l.ToLower()).ToList();
                var exactQuery = query.Where(p => locationsLower.Any(loc =>
                    (p.City != null && p.City.ToLower().Contains(loc)) ||
                    (p.State != null && p.State.ToLower().Contains(loc)) ||
                    (p.County != null && p.County.ToLower().Contains(loc)) ||
                    (p.CivilParish != null && p.CivilParish.ToLower().Contains(loc))));
                
                var exactCount = await exactQuery.CountAsync(ct);
                _logger.LogInformation("[LocationFilter] Encontradas {Count} propriedades nas localizações específicas. Scoring vai decidir os melhores.", exactCount);
                
                return (exactQuery, "specific_locations");
            }
            
            // Expandir localizações com IA
            var allExpandedLocations = new List<string>();
            
            if (locationType == "between" && locations.Count == 2)
            {
                // Range geográfico: procurar localizações ENTRE as duas
                _logger.LogInformation("[LocationFilter] Range geográfico detectado. Procurando localizações ENTRE: {Loc1} e {Loc2}", 
                    locations[0], locations[1]);
                
                var betweenLocations = await _locationAI.GetLocationsBetweenAsync(locations[0], locations[1], ct);
                allExpandedLocations.AddRange(betweenLocations);
                
                // Adicionar também as localizações originais
                allExpandedLocations.AddRange(locations);
            }
            else
            {
                // Localizações específicas (com poucos resultados) ou fallback: expandir cada localização
                _logger.LogInformation("[LocationFilter] Expandindo para localizações próximas: {Locations}", 
                    string.Join(", ", locations));
                
                foreach (var location in locations)
                {
                    var expanded = await _locationAI.GetNearbyLocationsAsync(location, ct);
                    allExpandedLocations.AddRange(expanded);
                }
                
                // Adicionar também as localizações originais
                allExpandedLocations.AddRange(locations);
            }

            // Remover duplicados e normalizar
            var uniqueExpandedLocations = allExpandedLocations
                .Select(l => l.ToLower())
                .Distinct()
                .ToList();

            if (uniqueExpandedLocations.Any())
            {
                _logger.LogInformation("[LocationFilter] IA expandiu para {Count} localizações: {ExpandedLocations}", 
                    uniqueExpandedLocations.Count, string.Join(", ", uniqueExpandedLocations));

                var expandedQuery = query.Where(p => uniqueExpandedLocations.Any(el =>
                    (p.City != null && p.City.ToLower().Contains(el)) ||
                    (p.State != null && p.State.ToLower().Contains(el)) ||
                    (p.County != null && p.County.ToLower().Contains(el)) ||
                    (p.CivilParish != null && p.CivilParish.ToLower().Contains(el))));

                var expandedCount = await expandedQuery.CountAsync(ct);
                _logger.LogInformation("[LocationFilter] Encontradas {Count} propriedades após expansão IA", expandedCount);

                return (expandedQuery, "ai_expanded_multiple");
            }

            _logger.LogWarning("[LocationFilter] Nenhuma propriedade encontrada para localizações: {Locations}", 
                string.Join(", ", locations));
            return (query.Where(p => false), "no_match_multiple");
        }
    }
}
