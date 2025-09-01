using realestate_ia_site.Server.Domain.Entities;
using System.Text.Json;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Filters
{
    public class TagsFilter : IPropertyFilter
    {
        private readonly ILogger<TagsFilter> _logger;

        public TagsFilter(ILogger<TagsFilter> logger)
        {
            _logger = logger;
        }

        public bool CanHandle(string filterKey) => filterKey == "tags";

        public string GetFilterName() => "TagsFilter";

        public Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default)
        {
            if (!filters.ContainsKey("tags") || filters["tags"] == null)
                return Task.FromResult(query);

            if (filters["tags"] is JsonElement tagsElement)
            {
                var tags = tagsElement.EnumerateArray()
                    .Select(t => t.GetString()?.ToLower())
                    .Where(t => !string.IsNullOrEmpty(t))
                    .ToList();

                if (tags.Any())
                {
                    _logger.LogDebug("Processando {TagCount} tags: {Tags}", tags.Count, string.Join(", ", tags));

                    foreach (var tag in tags)
                    {
                        query = ApplyTagFilter(query, tag);
                    }
                }
            }

            return Task.FromResult(query);
        }

        private IQueryable<Property> ApplyTagFilter(IQueryable<Property> query, string tag)
        {
            return tag switch
            {
                "garagem" or "garage" => ApplyGarageFilter(query),
                "amplo" => ApplyAmploFilter(query),
                "família" or "familia" => ApplyFamilyFilter(query),
                "varanda" => ApplyVarandaFilter(query),
                "piscina" => ApplyPiscinaFilter(query),
                "terraço" or "terraco" => ApplyTerracoFilter(query),
                _ => LogUnknownTag(query, tag)
            };
        }

        private IQueryable<Property> ApplyGarageFilter(IQueryable<Property> query)
        {
            _logger.LogDebug("Filtro 'garagem' aplicado");
            return query.Where(p => p.Garage);
        }

        private IQueryable<Property> ApplyAmploFilter(IQueryable<Property> query)
        {
            _logger.LogDebug("Filtro 'amplo' aplicado (área > 100m²)");
            return query.Where(p => p.Area > 100);
        }

        private IQueryable<Property> ApplyFamilyFilter(IQueryable<Property> query)
        {
            _logger.LogDebug("Filtro 'família' aplicado (3+ quartos)");
            return query.Where(p => p.Bedrooms >= 3);
        }

        private IQueryable<Property> ApplyVarandaFilter(IQueryable<Property> query)
        {
            _logger.LogDebug("Filtro 'varanda' aplicado (pesquisa por descrição)");
            return query.Where(p => p.Description != null && p.Description.ToLower().Contains("varanda"));
        }

        private IQueryable<Property> ApplyPiscinaFilter(IQueryable<Property> query)
        {
            _logger.LogDebug("Filtro 'piscina' aplicado (pesquisa por descrição)");
            return query.Where(p => p.Description != null && p.Description.ToLower().Contains("piscina"));
        }

        private IQueryable<Property> ApplyTerracoFilter(IQueryable<Property> query)
        {
            _logger.LogDebug("Filtro 'terraço' aplicado (pesquisa por descrição)");
            return query.Where(p => p.Description != null && 
                (p.Description.ToLower().Contains("terraço") || p.Description.ToLower().Contains("terraco")));
        }

        private IQueryable<Property> LogUnknownTag(IQueryable<Property> query, string tag)
        {
            _logger.LogDebug("Tag não reconhecida: {Tag}", tag);
            return query;
        }
    }
}