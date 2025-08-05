using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.DTOs;
using System.Text.Json;

namespace realestate_ia_site.Server.Services
{
    public class PropertyService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PropertyService> _logger;

        public PropertyService(ApplicationDbContext context, ILogger<PropertyService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<PropertySearchDto>> SearchPropertiesWithFiltersAsync(Dictionary<string, object> filtros)
        {
            _logger.LogInformation("🔍 Iniciando pesquisa de propriedades com {FilterCount} filtros", filtros.Count);
            _logger.LogDebug("Filtros recebidos: {@Filters}", filtros);

            var query = _context.Properties.AsQueryable();
            var filtersApplied = new List<string>();

            // Aplicar filtros
            if (filtros.ContainsKey("type") && filtros["type"] != null)
            {
                var type = filtros["type"].ToString();
                query = query.Where(p => p.Type != null && p.Type.ToLower().Contains(type.ToLower()));
                filtersApplied.Add($"type='{type}'");
                _logger.LogDebug("✅ Filtro 'type' aplicado: {Type}", type);
            }

            if (filtros.ContainsKey("location") && filtros["location"] != null)
            {
                var location = filtros["location"].ToString();
                query = query.Where(p => p.City != null && p.City.ToLower().Contains(location.ToLower()));
                filtersApplied.Add($"location='{location}'");
                _logger.LogDebug("✅ Filtro 'location' aplicado: {Location}", location);
            }

            if (filtros.ContainsKey("max_price") && filtros["max_price"] != null)
            {
                if (decimal.TryParse(filtros["max_price"].ToString(), out var maxPrice))
                {
                    query = query.Where(p => p.Price <= maxPrice);
                    filtersApplied.Add($"max_price<={maxPrice:C}");
                    _logger.LogDebug("✅ Filtro 'max_price' aplicado: {MaxPrice:C}", maxPrice);
                }
                else
                {
                    _logger.LogWarning("⚠️ Valor inválido para 'max_price': {Value}", filtros["max_price"]);
                }
            }

            if (filtros.ContainsKey("rooms") && filtros["rooms"] != null)
            {
                if (int.TryParse(filtros["rooms"].ToString(), out var rooms))
                {
                    query = query.Where(p => p.Bedrooms >= rooms);
                    filtersApplied.Add($"rooms>={rooms}");
                    _logger.LogDebug("✅ Filtro 'rooms' aplicado: {Rooms}+ quartos", rooms);
                }
                else
                {
                    _logger.LogWarning("⚠️ Valor inválido para 'rooms': {Value}", filtros["rooms"]);
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
                    _logger.LogDebug("🏷️ Processando {TagCount} tags: {Tags}", tags.Count, string.Join(", ", tags));
                    
                    foreach (var tag in tags)
                    {
                        switch (tag)
                        {
                            case "garagem":
                            case "garage":
                                query = query.Where(p => p.Garage);
                                filtersApplied.Add("garage=true");
                                _logger.LogDebug("✅ Filtro 'garagem' aplicado");
                                break;
                            case "amplo":
                                query = query.Where(p => p.Area > 100);
                                filtersApplied.Add("area>100m²");
                                _logger.LogDebug("✅ Filtro 'amplo' aplicado (área > 100m²)");
                                break;
                            case "família":
                            case "familia":
                                query = query.Where(p => p.Bedrooms >= 3);
                                filtersApplied.Add("bedrooms>=3");
                                _logger.LogDebug("✅ Filtro 'família' aplicado (3+ quartos)");
                                break;
                            default:
                                _logger.LogDebug("⚠️ Tag não reconhecida: {Tag}", tag);
                                break;
                        }
                    }
                }
            }

            _logger.LogInformation("📋 Filtros aplicados: {AppliedFilters}", string.Join(", ", filtersApplied));

            try
            {
                _logger.LogDebug("🗄️ Executando query na base de dados...");
                var properties = await query
                    .Take(10) // Limitar resultados
                    .ToListAsync();

                _logger.LogInformation("✅ Query executada com sucesso. Encontradas {PropertyCount} propriedades", properties.Count);
                
                if (properties.Count == 0)
                {
                    _logger.LogInformation("ℹ️ Nenhuma propriedade encontrada com os filtros aplicados");
                }
                else
                {
                    _logger.LogDebug("🏠 Propriedades encontradas: {PropertyIds}", 
                        string.Join(", ", properties.Select(p => p.Id)));
                }

                _logger.LogDebug("🔄 Convertendo {PropertyCount} propriedades para DTOs...", properties.Count);
                var result = properties.Select(PropertySearchDto.FromDomain).ToList();
                
                _logger.LogInformation("🎯 Pesquisa concluída com sucesso. Retornando {ResultCount} resultados", result.Count);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Erro ao executar query na base de dados. Filtros: {@Filters}", filtros);
                throw;
            }
        }
    }
}