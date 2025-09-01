using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Filters
{
    public class TypeFilter : IPropertyFilter
    {
        private readonly ILogger<TypeFilter> _logger;

        public TypeFilter(ILogger<TypeFilter> logger)
        {
            _logger = logger;
        }

        public bool CanHandle(string filterKey) => filterKey == "type";

        public string GetFilterName() => "TypeFilter";

        public Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            if (!filters.ContainsKey("type") || filters["type"] == null)
                return Task.FromResult(query);

            var type = filters["type"].ToString();
            var filteredQuery = query.Where(p => p.Type != null && p.Type.ToLower().Contains(type.ToLower()));
            
            _logger.LogDebug("Filtro 'type' aplicado: {Type}", type);
            return Task.FromResult(filteredQuery);
        }
    }
}