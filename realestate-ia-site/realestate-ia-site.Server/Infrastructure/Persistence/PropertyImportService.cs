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
            _logger.LogInformation("[Import] In�cio lote total={Total}", scrapperProperties.Length);
            
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
                _logger.LogWarning("[Import] Removidos {Count} duplicados do lote recebido. �nicas: {Unique}, Total: {Total}", 
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
                _logger.LogInformation("[Import] Conclu�do criadas={Created} atualizadas={Updated} erros={Errors}", result.Created, result.Updated, result.Errors);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Import] Erro durante importa��o em lote");
                throw;
            }
        }

        private async Task ProcessSinglePropertyAsync(ScraperPropertyDto scrapperDto, ImportResult result)
        {
            try
            {
                // Normalizar dados para comparação consistente
                var normalizedUrl = NormalizeString(scrapperDto.url);
                var normalizedTitle = NormalizeString(scrapperDto.titleFromListing);
                var normalizedLocation = NormalizeString(scrapperDto.location);

                _logger.LogTrace("[Import] Procurando propriedade url={Url} title={Title}", normalizedUrl, normalizedTitle);

                // 1. Tentar encontrar na base de dados
                Property? existingProperty = null;

                // Buscar por URL se disponível (mais confiável)
                if (!string.IsNullOrEmpty(normalizedUrl))
                {
                    existingProperty = await _context.Properties
                        .FirstOrDefaultAsync(p => p.Link != null && 
                            p.Link.ToLower().Trim().Replace(" ", "") == normalizedUrl);
                }

                // Se não encontrou por URL, tentar por Title + Location
                if (existingProperty == null && 
                    !string.IsNullOrEmpty(normalizedTitle) && 
                    !string.IsNullOrEmpty(normalizedLocation))
                {
                    existingProperty = await _context.Properties
                        .FirstOrDefaultAsync(p => 
                            p.Title != null && p.Address != null &&
                            p.Title.ToLower().Trim() == normalizedTitle &&
                            NormalizeAddress(p.Address) == normalizedLocation);
                }

                // 2. Verificar no ChangeTracker (previne duplicados no mesmo batch)
                if (existingProperty == null && !string.IsNullOrEmpty(normalizedUrl))
                {
                    existingProperty = _context.ChangeTracker
                        .Entries<Property>()
                        .Where(e => e.State == EntityState.Added)
                        .Select(e => e.Entity)
                        .FirstOrDefault(p => p.Link != null && 
                            p.Link.ToLower().Trim().Replace(" ", "") == normalizedUrl);
                }

                if (existingProperty != null)
                {
                    PropertyMapper.UpdatePropertyFromScrapper(existingProperty, scrapperDto);
                    result.Updated++;
                    _logger.LogDebug("[Import] Atualizada propriedade id={Id} title={Title}", existingProperty.Id, scrapperDto.titleFromListing);
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

        private static string NormalizeString(string? input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;
            
            return input.Trim().ToLowerInvariant().Replace(" ", "");
        }

        private static string NormalizeAddress(string? address)
        {
            if (string.IsNullOrWhiteSpace(address))
                return string.Empty;

            // Remover quebras de linha e normalizar
            return address
                .Replace("\n", " ")
                .Replace("\r", " ")
                .Replace("  ", " ")
                .Trim()
                .ToLowerInvariant()
                .Replace(" ", "");
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