using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.DTOs;
using realestate_ia_site.Server.Infrastructure.Persistence.Filters;

namespace realestate_ia_site.Server.Application.SearchAI
{
    public class PropertySearchHandler
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<PropertySearchHandler> _logger;
        private readonly IEnumerable<IPropertyFilter> _filters;

        public PropertySearchHandler(
            ApplicationDbContext context,
            ILogger<PropertySearchHandler> logger,
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
            _logger.LogInformation("Iniciando pesquisa de propriedades com {FilterCount} filtros", filtros.Count);
            _logger.LogDebug("Filtros recebidos: {@Filters}", filtros);

            cancellationToken.ThrowIfCancellationRequested();

            var query = _context.Properties.AsQueryable();
            var filtersApplied = new List<string>();

            // Aplicar todos os filtros dinamicamente
            foreach (var filtroKey in filtros.Keys)
            {
                var applicableFilters = _filters.Where(f => f.CanHandle(filtroKey));

                foreach (var filter in applicableFilters)
                {
                    query = await filter.ApplyAsync(query, filtros, cancellationToken);
                    filtersApplied.Add($"{filter.GetFilterName()}({filtroKey})");
                }
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
    }
}