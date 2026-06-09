using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Application.Features.Properties.Search.Filters
{
    public class TagsFilter : IPropertyFilter
    {
        private readonly ILogger<TagsFilter> _logger;

        public TagsFilter(ILogger<TagsFilter> logger) => _logger = logger;

        public bool CanHandle(string filterKey) => filterKey == "tags";

        public string GetFilterName() => nameof(TagsFilter);

        public Task<PropertyFilterResult> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            if (!filters.TryGetValue("tags", out var tagsObj) || tagsObj == null) return Task.FromResult(new PropertyFilterResult(query));
            var raw = tagsObj.ToString();
            if (string.IsNullOrWhiteSpace(raw)) return Task.FromResult(new PropertyFilterResult(query));
            var tags = raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                          .Select(t => t.ToLower()).ToArray();
            if (tags.Length == 0) return Task.FromResult(new PropertyFilterResult(query));
            _logger.LogDebug("[SearchFilter] tags solicitadas (n�o suportado no modelo) tags={Tags}", string.Join(";", tags));
            return Task.FromResult(new PropertyFilterResult(query));
        }
    }
}
