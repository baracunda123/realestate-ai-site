using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Infrastructure.Persistence;
using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.Features.Properties.Search.Filters;
using realestate_ia_site.Server.Application.Features.Properties.Scoring;
using realestate_ia_site.Server.Domain.Enums;

namespace realestate_ia_site.Server.Application.Features.Properties.Search
{
    public sealed class PropertySearchService : IPropertySearchService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PropertySearchService> _logger;
        private readonly IEnumerable<IPropertyFilter> _filters;
        private readonly IPropertyScoringService _scoringService;

        public PropertySearchService(
            ApplicationDbContext context,
            ILogger<PropertySearchService> logger,
            IEnumerable<IPropertyFilter> filters,
            IPropertyScoringService scoringService)
        {
            _context = context;
            _logger = logger;
            _filters = filters;
            _scoringService = scoringService;
        }

        public async Task<List<PropertySearchDto>> SearchPropertiesWithFiltersAsync(
            Dictionary<string, object> filtros,
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(filtros, nameof(filtros));
            _logger.LogInformation("[Search] Inicio da pesquisa com filtros={FilterCount}", filtros.Count);
            _logger.LogDebug("[Search] Filtros recebidos {@Filters}", filtros);

            if (filtros.Count == 0) return new List<PropertySearchDto>();

            cancellationToken.ThrowIfCancellationRequested();

            // Filtrar apenas anúncios ativos
            var query = _context.Properties
                .Where(p => p.Status == PropertyStatus.Active)
                .AsQueryable();

            // Criar lista de chaves antes de iterar para evitar "Collection was modified"
            var filtroKeys = filtros.Keys.ToList();
            foreach (var filtroKey in filtroKeys)
            {
                var applicable = _filters.FirstOrDefault(f => f.CanHandle(filtroKey));
                if (applicable == null)
                {
                    _logger.LogWarning("[Search] Filtro desconhecido key={Key}", filtroKey);
                    continue;
                }
                query = await applicable.ApplyAsync(query, filtros, cancellationToken);
                _logger.LogDebug("[Search] Filtro aplicado filter={Filter} key={Key}", applicable.GetFilterName(), filtroKey);
            }

            try
            {
                // Buscar mais resultados para permitir scoring inteligente
                // A IA vai ordenar e retornar os 10 mais relevantes
                // AsNoTracking para melhor performance (não precisa rastrear mudanças)

                // Limite dinâmico baseado no tipo de pesquisa:
                // - Range geográfico ("between"): 50 propriedades (cobre múltiplas localizações)
                // - Localizações específicas: 30 propriedades (suficiente para 1-2 localizações)
                var limit = 30; // default
                if (filtros.TryGetValue("location_type", out var locationType) && 
                    locationType?.ToString()?.ToLower() == "between")
                {
                    limit = 50;
                    _logger.LogDebug("[Search] Range geográfico detectado, usando limite de {Limit} propriedades", limit);
                }

                var properties = await query.AsNoTracking().Take(limit).ToListAsync(cancellationToken);

                // Get latest price changes for all properties (last 30 days)
                var propertyIds = properties.Select(p => p.Id).ToList();
                var cutoffDate = DateTime.UtcNow.AddDays(-30);

                var latestPriceChanges = await _context.PropertyPriceHistories
                    .Where(h => propertyIds.Contains(h.PropertyId) && h.ChangedAt >= cutoffDate)
                    .GroupBy(h => h.PropertyId)
                    .Select(g => g.OrderByDescending(h => h.ChangedAt).FirstOrDefault())
                    .ToListAsync(cancellationToken);
                
                var priceChangeDict = latestPriceChanges
                    .Where(h => h != null)
                    .ToDictionary(h => h!.PropertyId, h => h);

                var result = properties.Select(p => 
                {
                    priceChangeDict.TryGetValue(p.Id, out var priceChange);
                    return PropertySearchDto.FromDomain(p, priceChange);
                }).ToList();

                // Aplicar features encontradas (se houver pesquisa por features)
                if (filtros.TryGetValue("_matched_features", out var matchedFeaturesObj) && 
                    matchedFeaturesObj is Dictionary<string, List<string>> matchedFeatures)
                {
                    foreach (var property in result)
                    {
                        if (matchedFeatures.TryGetValue(property.Id, out var features))
                        {
                            property.MatchedFeatures = features;
                        }
                    }
                    
                    _logger.LogInformation("[Search] Features aplicadas a {Count} propriedades", 
                        result.Count(p => p.MatchedFeatures != null));
                }

                // Aplicar scoring inteligente se temos contexto
                if (filtros.TryGetValue("session_id", out var sessionIdObj) && sessionIdObj != null)
                {
                    var sessionId = sessionIdObj.ToString();
                    var userQuery = filtros.TryGetValue("user_query", out var queryObj) 
                        ? queryObj?.ToString() ?? "" 
                        : "";

                    result = await _scoringService.ScoreAndRankPropertiesAsync(
                        result,
                        userQuery,
                        sessionId!,
                        filtros,
                        cancellationToken);

                    _logger.LogInformation("[Search] Propriedades ordenadas por scoring inteligente");
                }

                // Retornar top 10 após scoring
                result = result.Take(10).ToList();

                _logger.LogInformation("[Search] Concluida a pesquisa com {Count} propriedades", result.Count);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Search] Erro na execucao da query com filtros={@Filters}", filtros);
                throw;
            }
        }

        public async Task<List<PropertySearchDto>> GetTopPicksAsync(
            Dictionary<string, object> filtros,
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(filtros, nameof(filtros));
            _logger.LogInformation("[Search] Gerando Top Picks");

            var topPicksFilters = new Dictionary<string, object>(filtros)
            {
                ["generate_top_picks"] = "true"
            };

            // Filtrar apenas anúncios ativos
            var query = _context.Properties
                .Where(p => p.Status == PropertyStatus.Active)
                .AsQueryable();

            // Criar lista de chaves antes de iterar para evitar "Collection was modified"
            var filtroKeys = filtros.Keys.Where(k => k != "sort" && k != "cheaper_hint").ToList();
            foreach (var filtroKey in filtroKeys)
            {
                foreach (var filter in _filters.Where(f => f.CanHandle(filtroKey)))
                {
                    query = await filter.ApplyAsync(query, filtros, cancellationToken);
                }
            }

            var topPicksFilter = _filters.FirstOrDefault(f => f.CanHandle("generate_top_picks"));
            if (topPicksFilter != null)
            {
                query = await topPicksFilter.ApplyAsync(query, topPicksFilters, cancellationToken);
            }

            var properties = await query.ToListAsync(cancellationToken);
            
            // Get latest price changes for all properties (last 30 days)
            var propertyIds = properties.Select(p => p.Id).ToList();
            var cutoffDate = DateTime.UtcNow.AddDays(-30);
            
            var latestPriceChanges = await _context.PropertyPriceHistories
                .Where(h => propertyIds.Contains(h.PropertyId) && h.ChangedAt >= cutoffDate)
                .GroupBy(h => h.PropertyId)
                .Select(g => g.OrderByDescending(h => h.ChangedAt).FirstOrDefault())
                .ToListAsync(cancellationToken);
            
            var priceChangeDict = latestPriceChanges
                .Where(h => h != null)
                .ToDictionary(h => h!.PropertyId, h => h);

            var result = properties.Select(p => 
            {
                priceChangeDict.TryGetValue(p.Id, out var priceChange);
                return PropertySearchDto.FromDomain(p, priceChange);
            }).ToList();

            _logger.LogInformation("[Search] Top Picks gerados count={Count}", result.Count);
            return result;
        }
    }
}
