using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.DTOs.Scraper;
using realestate_ia_site.Server.Infrastructure.ExternalServices;
using realestate_ia_site.Server.Utils;

namespace realestate_ia_site.Server.Infrastructure.Persistence
{
    public class PropertyImportService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PropertyImportService> _logger;
        private readonly GoogleMapsService _googleMapsService;

        public PropertyImportService(ApplicationDbContext context, ILogger<PropertyImportService> logger, GoogleMapsService googleMapsService)
        {
            _context = context;
            _logger = logger;
            _googleMapsService = googleMapsService;
        }

        public async Task<ImportResult> ImportScrapperPropertiesAsync(ScraperPropertyDto[] scrapperProperties)
        {
            _logger.LogInformation("Iniciando importação de {Count} propriedades do scrapper", scrapperProperties.Length);
            
            var result = new ImportResult();
            
            try
            {
                foreach (var scrapperProperty in scrapperProperties)
                {
                    await ProcessSinglePropertyAsync(scrapperProperty, result);
                }

                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Importação concluída. Criadas: {Created}, Atualizadas: {Updated}, Erros: {Errors}", 
                    result.Created, result.Updated, result.Errors);
                
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro durante importação em lote");
                throw;
            }
        }

        private async Task ProcessSinglePropertyAsync(ScraperPropertyDto scrapperDto, ImportResult result)
        {
            try
            {
                // Verificar se propriedade já existe (por link ou título + localização)
                var existingProperty = await _context.Properties
                    .FirstOrDefaultAsync(p => p.Link == scrapperDto.url || 
                                            p.Title == scrapperDto.titleFromListing && p.Address == scrapperDto.location);

                if (existingProperty != null)
                {
                    // Atualizar propriedade existente usando o mapper
                    await PropertyMapper.UpdatePropertyFromScrapperAsync(existingProperty, scrapperDto);
                    result.Updated++;
                    _logger.LogDebug("Propriedade atualizada: {Title}", scrapperDto.titleFromListing);
                }
                else
                {
                    // Criar nova propriedade usando o mapper
                    var newProperty = await PropertyMapper.MapToPropertyEntityAsync(scrapperDto, _googleMapsService);
                    _context.Properties.Add(newProperty);
                    result.Created++;
                    _logger.LogDebug("Nova propriedade criada: {Title}", scrapperDto.titleFromListing);
                }
            }
            catch (Exception ex)
            {
                result.Errors++;
                _logger.LogError(ex, "Erro ao processar propriedade: {Title}", scrapperDto.titleFromListing);
            }
        }
    }

    public class ImportResult
    {
        public int Created { get; set; }
        public int Updated { get; set; }
        public int Errors { get; set; }
        public int Total => Created + Updated + Errors;
    }
}