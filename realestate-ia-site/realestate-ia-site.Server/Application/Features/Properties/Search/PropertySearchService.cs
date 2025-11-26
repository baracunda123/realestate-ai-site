using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Infrastructure.Persistence;
using realestate_ia_site.Server.Application.Common.Context;
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
        private readonly UserRequestContext _userContext;

        public PropertySearchService(
            ApplicationDbContext context,
            ILogger<PropertySearchService> logger,
            IEnumerable<IPropertyFilter> filters,
            IPropertyScoringService scoringService,
            UserRequestContext userContext)
        {
            _context = context;
            _logger = logger;
            _filters = filters;
            _scoringService = scoringService;
            _userContext = userContext;
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

            // Agrupar keys por filtro para evitar chamadas duplicadas
            // Ex: max_price e min_price são ambos tratados pelo PriceFilter
            var filtroKeys = filtros.Keys.ToList();
            var processedFilters = new HashSet<string>();

            foreach (var filtroKey in filtroKeys)
            {
                var applicable = _filters.FirstOrDefault(f => f.CanHandle(filtroKey));
                if (applicable == null)
                {
                    _logger.LogWarning("[Search] Filtro desconhecido key={Key}", filtroKey);
                    continue;
                }
                
                // Evitar chamar o mesmo filtro múltiplas vezes
                var filterName = applicable.GetFilterName();
                if (processedFilters.Contains(filterName))
                {
                    _logger.LogDebug("[Search] Filtro {Filter} já processado, ignorando key={Key}", filterName, filtroKey);
                    continue;
                }
                
                query = await applicable.ApplyAsync(query, filtros, cancellationToken);
                processedFilters.Add(filterName);
                _logger.LogDebug("[Search] Filtro aplicado filter={Filter} key={Key}", filterName, filtroKey);
            }

            try
            {
                // Buscar todas as propriedades que correspondem aos filtros
                // AsNoTracking para melhor performance (não precisa rastrear mudanças)
                var properties = await query.AsNoTracking().ToListAsync(cancellationToken);

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

                // Aplicar scoring inteligente se temos contexto (via UserRequestContext)
                if (!string.IsNullOrEmpty(_userContext.SessionId))
                {
                    result = await _scoringService.ScoreAndRankPropertiesAsync(
                        result,
                        filtros,
                        cancellationToken);

                    _logger.LogInformation("[Search] Propriedades ordenadas por scoring inteligente");
                }

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
