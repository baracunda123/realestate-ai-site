using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.DTOs.Scraper;
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
            _logger.LogInformation("[Import] Início lote total={Total}", scrapperProperties.Length);
            var result = new ImportResult();
            try
            {
                foreach (var scrapperProperty in scrapperProperties)
                {
                    await ProcessSinglePropertyAsync(scrapperProperty, result);
                }
                await _context.SaveChangesAsync();
                _logger.LogInformation("[Import] Concluído criadas={Created} atualizadas={Updated} erros={Errors}", result.Created, result.Updated, result.Errors);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Import] Erro durante importação em lote");
                throw;
            }
        }

        private async Task ProcessSinglePropertyAsync(ScraperPropertyDto scrapperDto, ImportResult result)
        {
            try
            {
                var existingProperty = await _context.Properties
                    .FirstOrDefaultAsync(p => p.Link == scrapperDto.url ||
                        (p.Title == scrapperDto.titleFromListing && p.Address == scrapperDto.location));

                if (existingProperty != null)
                {
                    PropertyMapper.UpdatePropertyFromScrapper(existingProperty, scrapperDto);
                    result.Updated++;
                    _logger.LogDebug("[Import] Atualizada propriedade title={Title}", scrapperDto.titleFromListing);
                }
                else
                {
                    var newProperty = await PropertyMapper.MapToPropertyEntityAsync(scrapperDto, _googleMapsService);
                    _context.Properties.Add(newProperty);
                    result.Created++;
                    _logger.LogDebug("[Import] Criada propriedade title={Title}", scrapperDto.titleFromListing);
                }
            }
            catch (Exception ex)
            {
                result.Errors++;
                _logger.LogError(ex, "[Import] Erro a processar propriedade title={Title}", scrapperDto.titleFromListing);
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