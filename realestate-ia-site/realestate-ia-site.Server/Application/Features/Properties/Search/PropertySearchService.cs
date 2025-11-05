using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Infrastructure.Persistence;
using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.Features.Properties.Search.Filters;

namespace realestate_ia_site.Server.Application.Features.Properties.Search
{
    public sealed class PropertySearchService : IPropertySearchService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PropertySearchService> _logger;
        private readonly IEnumerable<IPropertyFilter> _filters;

        public PropertySearchService(
            ApplicationDbContext context,
            ILogger<PropertySearchService> logger,
            IEnumerable<IPropertyFilter> filters)
        {
            _context = context;
            _logger = logger;
            _filters = filters;
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
            var query = _context.Properties.AsQueryable();

            foreach (var filtroKey in filtros.Keys)
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
                var properties = await query.Take(10).ToListAsync(cancellationToken);
                var result = properties.Select(PropertySearchDto.FromDomain).ToList();
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

            var query = _context.Properties.AsQueryable();
            foreach (var filtroKey in filtros.Keys.Where(k => k != "sort" && k != "cheaper_hint"))
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
            var result = properties.Select(PropertySearchDto.FromDomain).ToList();
            _logger.LogInformation("[Search] Top Picks gerados count={Count}", result.Count);
            return result;
        }
    }
}
