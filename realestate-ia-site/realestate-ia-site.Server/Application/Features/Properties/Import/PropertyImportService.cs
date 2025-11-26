using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Infrastructure.Persistence;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.ExternalServices.Interfaces;
using realestate_ia_site.Server.Application.Common.Mappings;
using realestate_ia_site.Server.Application.Services;
using realestate_ia_site.Server.Domain.Enums;

namespace realestate_ia_site.Server.Application.Features.Properties.Import
{
    public class PropertyImportService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PropertyImportService> _logger;
        private readonly IGeocodingService _geocodingService;
        private readonly IPropertyTrackingService _trackingService;

        public PropertyImportService(
            ApplicationDbContext context, 
            ILogger<PropertyImportService> logger, 
            IGeocodingService geocodingService,
            IPropertyTrackingService trackingService)
        {
            _context = context;
            _logger = logger;
            _geocodingService = geocodingService;
            _trackingService = trackingService;
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
                // Coletar IDs das propriedades processadas e source site
                var processedPropertyIds = new List<string>();
                string? sourceSite = null;

                foreach (var scrapperProperty in uniqueProperties)
                {
                    var propertyId = await ProcessSinglePropertyAsync(scrapperProperty, result);
                    if (!string.IsNullOrEmpty(propertyId))
                    {
                        processedPropertyIds.Add(propertyId);
                    }
                    
                    // Capturar o source site do primeiro anúncio
                    if (sourceSite == null && !string.IsNullOrWhiteSpace(scrapperProperty.site))
                    {
                        sourceSite = scrapperProperty.site;
                    }
                }
                
                await _context.SaveChangesAsync();
                
                // Fazer tracking automático após o import
                if (!string.IsNullOrWhiteSpace(sourceSite) && processedPropertyIds.Any())
                {
                    _logger.LogInformation("[Import] Iniciando tracking para {Count} propriedades de {Source}", 
                        processedPropertyIds.Count, sourceSite);
                    
                    var (updated, archived) = await _trackingService.UpdatePropertyTrackingAsync(
                        processedPropertyIds, 
                        sourceSite);
                    
                    result.Archived = archived;
                    
                    _logger.LogInformation("[Import] Tracking concluído: {Updated} atualizadas, {Archived} arquivadas", 
                        updated, archived);
                }
                
                _logger.LogInformation("[Import] Concluido criadas={Created} atualizadas={Updated} arquivadas={Archived} erros={Errors}", 
                    result.Created, result.Updated, result.Archived, result.Errors);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Import] Erro durante importação em lote");
                throw;
            }
        }

        private async Task<string?> ProcessSinglePropertyAsync(ScraperPropertyDto scrapperDto, ImportResult result)
        {
            try
            {
                // Validar se URL existe
                if (string.IsNullOrWhiteSpace(scrapperDto.url))
                {
                    _logger.LogWarning("[Import] Propriedade sem URL ignorada. Title={Title}", 
                        scrapperDto.titleFromListing);
                    result.Errors++;
                    return null;
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
                    
                    // LastSeenAt e reativação são tratados pelo PropertyTrackingService
                    existingProperty.LastSeenAt = DateTime.UtcNow;
                    
                    result.Updated++;
                    return existingProperty.Id;
                }
                else
                {
                    _logger.LogInformation("[Import] CREATE nova propriedade url={Url}", 
                        urlToSearch);
                    var newProperty = await PropertyMapper.MapToPropertyEntityAsync(scrapperDto, _geocodingService);
                    
                    // Inicializar campos de tracking
                    newProperty.LastSeenAt = DateTime.UtcNow;
                    newProperty.Status = PropertyStatus.Active;
                    
                    _context.Properties.Add(newProperty);
                    result.Created++;
                    return newProperty.Id;
                }
            }
            catch (Exception ex)
            {
                result.Errors++;
                _logger.LogError(ex, "[Import] Erro a processar propriedade url={Url} title={Title}", 
                    scrapperDto.url, scrapperDto.titleFromListing);
                return null;
            }
        }

    }

    public class ImportResult
    {
        public int Created { get; set; }
        public int Updated { get; set; }
        public int Errors { get; set; }
        public int Archived { get; set; }
        public int Total => Created + Updated + Errors;
    }
}

