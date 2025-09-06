using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.PropertySearch.Filters;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Filters
{
    public class TypeFilter : IPropertyFilter
    {
        private readonly ILogger<TypeFilter> _logger;

        public TypeFilter(ILogger<TypeFilter> logger) => _logger = logger;

        public bool CanHandle(string filterKey) => filterKey == "type";

        public string GetFilterName() => nameof(TypeFilter);

        public Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            if (!filters.TryGetValue("type", out var value) || value == null) return Task.FromResult(query);
            var type = value.ToString();
            if (string.IsNullOrWhiteSpace(type)) return Task.FromResult(query);
            query = query.Where(p => p.Type != null && p.Type.ToLower().Contains(type.ToLower()));
            _logger.LogDebug("[SearchFilter] type={Type}", type);
            return Task.FromResult(query);
        }
    }
}