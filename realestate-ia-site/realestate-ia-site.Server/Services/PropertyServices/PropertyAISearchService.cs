using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.DTOs;
using realestate_ia_site.Server.Services.AIServices;
using System.Text.Json;

namespace realestate_ia_site.Server.Services.PropertyServices
{
    public class PropertyAISearchService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PropertyAISearchService> _logger;
        private readonly LocationAIService _locationAI;

        public PropertyAISearchService(ILogger<PropertyAISearchService> logger,ApplicationDbContext context,LocationAIService locationAI)
        {
            _context = context;
            _logger = logger;
            _locationAI = locationAI;
        }

        public async Task<List<PropertySearchDto>> SearchPropertiesWithFiltersAsync(Dictionary<string, object> filtros)
        {
            _logger.LogInformation("Iniciando pesquisa de propriedades com {FilterCount} filtros", filtros.Count);
            _logger.LogDebug("Filtros recebidos: {@Filters}", filtros);

            var query = _context.Properties.AsQueryable();
            var filtersApplied = new List<string>();

            // Aplicar filtros de tipo
            if (filtros.ContainsKey("type") && filtros["type"] != null)
            {
                var type = filtros["type"].ToString();
                query = query.Where(p => p.Type != null && p.Type.ToLower().Contains(type.ToLower()));
                filtersApplied.Add($"type='{type}'");
                _logger.LogDebug("Filtro 'type' aplicado: {Type}", type);
            }

            // Aplicar filtro de localização com IA
            //string locationSearchType = "none";
            if (filtros.ContainsKey("location") && filtros["location"] != null)
            {
                var location = filtros["location"].ToString();
                var (locationQuery, searchType) = await ApplyLocationFilterWithAI(query, location);
                query = locationQuery;
                //locationSearchType = searchType;
                filtersApplied.Add($"location='{location}' ({searchType})");
                _logger.LogDebug("Filtro 'location' aplicado com IA: {Location} -> {SearchType}", location, searchType);
            }

            // Aplicar outros filtros...
            if (filtros.ContainsKey("max_price") && filtros["max_price"] != null)
            {
                if (decimal.TryParse(filtros["max_price"].ToString(), out var maxPrice))
                {
                    query = query.Where(p => p.Price <= maxPrice);
                    filtersApplied.Add($"max_price<={maxPrice:C}");
                    _logger.LogDebug("Filtro 'max_price' aplicado: {MaxPrice:C}", maxPrice);
                }
            }

            if (filtros.ContainsKey("rooms") && filtros["rooms"] != null)
            {
                if (int.TryParse(filtros["rooms"].ToString(), out var rooms))
                {
                    query = query.Where(p => p.Bedrooms >= rooms);
                    filtersApplied.Add($"rooms>={rooms}");
                    _logger.LogDebug("Filtro 'rooms' aplicado: {Rooms}+ quartos", rooms);
                }
            }

            // Aplicar filtro de tags se existir
            if (filtros.ContainsKey("tags") && filtros["tags"] is JsonElement tagsElement)
            {
                var tags = tagsElement.EnumerateArray()
                    .Select(t => t.GetString()?.ToLower())
                    .Where(t => !string.IsNullOrEmpty(t))
                    .ToList();

                if (tags.Any())
                {
                    _logger.LogDebug("Processando {TagCount} tags: {Tags}", tags.Count, string.Join(", ", tags));

                    foreach (var tag in tags)
                    {
                        switch (tag)
                        {
                            case "garagem":
                            case "garage":
                                query = query.Where(p => p.Garage);
                                filtersApplied.Add("garage=true");
                                _logger.LogDebug("Filtro 'garagem' aplicado");
                                break;
                            case "amplo":
                                query = query.Where(p => p.Area > 100);
                                filtersApplied.Add("area>100m²");
                                _logger.LogDebug("Filtro 'amplo' aplicado (área > 100m²)");
                                break;
                            case "família":
                            case "familia":
                                query = query.Where(p => p.Bedrooms >= 3);
                                filtersApplied.Add("bedrooms>=3");
                                _logger.LogDebug("Filtro 'família' aplicado (3+ quartos)");
                                break;
                            default:
                                _logger.LogDebug("Tag não reconhecida: {Tag}", tag);
                                break;
                        }
                    }
                }
            }

            // Resto do método igual...
            _logger.LogInformation("Filtros aplicados: {AppliedFilters}", string.Join(", ", filtersApplied));

            try
            {
                var properties = await query.Take(10).ToListAsync();
                var result = properties.Select(PropertySearchDto.FromDomain).ToList();

                // Adicionar metadata sobre o tipo de busca de localização
               /* foreach (var prop in result)
                {
                    prop.SearchMetadata = locationSearchType; // Adicionar esta propriedade ao DTO se necessário
                }*/

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao executar query na base de dados. Filtros: {@Filters}", filtros);
                throw;
            }
        }

        private async Task<(IQueryable<Property>, string)> ApplyLocationFilterWithAI(IQueryable<Property> query, string location)
        {
            // 1. Primeiro tentar busca exata
            var exactQuery = query.Where(p => p.City != null && p.City.ToLower().Contains(location.ToLower())
                                           || p.State != null && p.State.ToLower().Contains(location.ToLower())
                                           || p.County != null && p.County.ToLower().Contains(location.ToLower())
                                           || p.CivilParish != null && p.CivilParish.ToLower().Contains(location.ToLower()));

            var exactCount = await exactQuery.CountAsync();

            if (exactCount > 0)
            {
                _logger.LogDebug("Encontrados {Count} resultados com correspondência exata para: {Location}", exactCount, location);
                return (exactQuery, "exact_match");
            }

            // 2. Se não há resultados exatos, usar IA para expandir busca
            _logger.LogDebug("Nenhum resultado exato encontrado para: {Location}. Usando IA para encontrar localizações próximas...", location);

            var expandedLocations = await GetExpandedLocationsWithAI(location);

            if (expandedLocations.Any())
            {
                var expandedQuery = query.Where(p => expandedLocations.Any(expandedLoc =>
                    p.City != null && p.City.ToLower().Contains(expandedLoc.ToLower()) ||
                    p.State != null && p.State.ToLower().Contains(expandedLoc.ToLower()) ||
                    p.County != null && p.County.ToLower().Contains(expandedLoc.ToLower()) ||
                    p.CivilParish != null && p.CivilParish.ToLower().Contains(expandedLoc.ToLower())));

                var expandedCount = await expandedQuery.CountAsync();
                _logger.LogDebug("Encontrados {Count} resultados com localizações expandidas: {ExpandedLocations}",
                    expandedCount, string.Join(", ", expandedLocations));

                return (expandedQuery, $"ai_expanded: {string.Join(", ", expandedLocations)}");
            }

            // 3. Se a IA não encontrou nada, retornar busca original
            _logger.LogDebug("IA não conseguiu expandir a localização: {Location}", location);
            return (exactQuery, "no_expansion");
        }

        private async Task<List<string>> GetExpandedLocationsWithAI(string location)
        {
            return await _locationAI.GetNearbyLocationsAsync(location);
        }
    }
}
