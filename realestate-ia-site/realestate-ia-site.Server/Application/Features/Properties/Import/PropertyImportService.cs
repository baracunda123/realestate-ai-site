using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Infrastructure.Persistence;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.ExternalServices.Interfaces;
using realestate_ia_site.Server.Application.Common.Mappings;

namespace realestate_ia_site.Server.Application.Features.Properties.Import
{
    public class PropertyImportService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PropertyImportService> _logger;
        private readonly IGeocodingService _geocodingService;

        public PropertyImportService(ApplicationDbContext context, ILogger<PropertyImportService> logger, IGeocodingService geocodingService)
        {
            _context = context;
            _logger = logger;
            _geocodingService = geocodingService;
        }

        public async Task<ImportResult> ImportScrapperPropertiesAsync(ScraperPropertyDto[] scrapperProperties)
        {
            _logger.LogInformation("[Import] Inicio lote total={Total}", scrapperProperties.Length);
            
            // Deduplicar o array recebido antes de processar
            var uniqueProperties = scrapperProperties
                .GroupBy(p => 
                {
                    // Agrupar por URL (preferencial) ou por Title+Location
                    var key = !string.IsNullOrWhiteSpace(p.url) 
                        ? p.url.Trim().ToLowerInvariant() 
                        : $"{p.titleFromListing?.Trim().ToLowerInvariant()}|{p.location?.Trim().ToLowerInvariant()}";
                    return key;
                })
                .Select(g => g.First()) // Pegar apenas o primeiro de cada grupo
                .ToArray();

            if (uniqueProperties.Length < scrapperProperties.Length)
            {
                    _logger.LogWarning("[Import] Removidos {Count} duplicados do lote recebido. unicas: {Unique}, Total: {Total}", 
                    scrapperProperties.Length - uniqueProperties.Length, 
                    uniqueProperties.Length, 
                    scrapperProperties.Length);
            }

            var result = new ImportResult();
            try
            {
                foreach (var scrapperProperty in uniqueProperties)
                {
                    await ProcessSinglePropertyAsync(scrapperProperty, result);
                }
                await _context.SaveChangesAsync();
                _logger.LogInformation("[Import] Concluido criadas={Created} atualizadas={Updated} erros={Errors}", result.Created, result.Updated, result.Errors);
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
                // Validar se URL existe
                if (string.IsNullOrWhiteSpace(scrapperDto.url))
                {
                    _logger.LogWarning("[Import] Propriedade sem URL ignorada. Title={Title}", 
                        scrapperDto.titleFromListing);
                    result.Errors++;
                    return;
                }
                     
                // Apenas trim - manter URL exatamente como vem do scraper
                var urlToSearch = scrapperDto.url.Trim();

                _logger.LogInformation("[Import] Processando URL={Url}", urlToSearch);

                Property? existingProperty = null;

                // 1. Buscar na base de dados por Link exato
                existingProperty = await _context.Properties
                    .FirstOrDefaultAsync(p => p.Link == urlToSearch);

                if (existingProperty != null)
                {
                    _logger.LogInformation("[Import] Encontrada na BD: id={Id}, link={Link}", 
                        existingProperty.Id, existingProperty.Link);
                }

                // 2. Se não encontrou na BD, verificar no ChangeTracker (mesmo batch)
                if (existingProperty == null)
                {
                    existingProperty = _context.ChangeTracker
                        .Entries<Property>()
                        .Where(e => e.State == EntityState.Added)
                        .Select(e => e.Entity)
                        .FirstOrDefault(p => p.Link == urlToSearch);
                    
                    if (existingProperty != null)
                    {
                        _logger.LogInformation("[Import] Encontrada no ChangeTracker: id={Id}, link={Link}", 
                            existingProperty.Id, existingProperty.Link);
                    }
                }

                if (existingProperty != null)
                {
                    _logger.LogInformation("[Import] UPDATE propriedade existente id={Id}, price={Price}", 
                        existingProperty.Id,existingProperty.Price);
                    PropertyMapper.UpdatePropertyFromScrapper(existingProperty, scrapperDto);
                    result.Updated++;
                }
                else
                {
                    _logger.LogInformation("[Import] CREATE nova propriedade url={Url}", 
                        urlToSearch);
                    var newProperty = await PropertyMapper.MapToPropertyEntityAsync(scrapperDto, _geocodingService);
                    _context.Properties.Add(newProperty);
                    result.Created++;
                }
            }
            catch (Exception ex)
            {
                result.Errors++;
                _logger.LogError(ex, "[Import] Erro a processar propriedade url={Url} title={Title}", 
                    scrapperDto.url, scrapperDto.titleFromListing);
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

