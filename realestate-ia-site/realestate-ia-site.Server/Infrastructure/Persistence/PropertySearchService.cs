using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.DTOs;
using realestate_ia_site.Server.Infrastructure.Persistence.Filters;
using realestate_ia_site.Server.Infrastructure.Persistence.Interfaces;

namespace realestate_ia_site.Server.Infrastructure.Persistence
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
            
            _logger.LogInformation("Iniciando pesquisa de propriedades com {FilterCount} filtros", filtros.Count);
            _logger.LogDebug("Filtros recebidos: {@Filters}", filtros);

            // Se não há filtros, retornar lista vazia
            if (filtros.Count == 0)
            {
                _logger.LogInformation("Nenhum filtro fornecido - retornando lista vazia");
                return new List<PropertySearchDto>();
            }

            cancellationToken.ThrowIfCancellationRequested();

            var query = _context.Properties.AsQueryable();
            var filtersApplied = new List<string>();

            // Aplicar todos os filtros dinamicamente
            foreach (var filtroKey in filtros.Keys)
            {
                var applicableFilter = _filters.FirstOrDefault(f => f.CanHandle(filtroKey));
                if (applicableFilter == null)
                {
                    _logger.LogWarning("Filtro não reconhecido: {FilterKey}", filtroKey);
                    continue;
                }
                query = await applicableFilter.ApplyAsync(query, filtros, cancellationToken);
                filtersApplied.Add($"{applicableFilter.GetFilterName()}({filtroKey})");
            }

            _logger.LogInformation("Filtros aplicados: {AppliedFilters}", string.Join(", ", filtersApplied));

            try
            {
                var properties = await query.Take(10).ToListAsync(cancellationToken);
                var result = properties.Select(PropertySearchDto.FromDomain).ToList();

                _logger.LogInformation("Pesquisa concluída. Encontradas {PropertyCount} propriedades", result.Count);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao executar query na base de dados. Filtros: {@Filters}", filtros);
                throw;
            }
        }

        public async Task<List<PropertySearchDto>> GetTopPicksAsync(
            Dictionary<string, object> filtros, 
            CancellationToken cancellationToken = default)
        {
            ArgumentNullException.ThrowIfNull(filtros, nameof(filtros));
            
            _logger.LogInformation("Gerando Top Picks com scoring heurístico");
            
            var topPicksFilters = new Dictionary<string, object>(filtros)
            {
                ["generate_top_picks"] = "true"
            };
            
            var query = _context.Properties.AsQueryable();
            
            foreach (var filtroKey in filtros.Keys.Where(k => k != "sort" && k != "cheaper_hint"))
            {
                var applicableFilters = _filters.Where(f => f.CanHandle(filtroKey));
                
                foreach (var filter in applicableFilters)
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
            
            _logger.LogInformation("Top Picks gerados: {Count} propriedades", result.Count);
            return result;
        }
    }
}