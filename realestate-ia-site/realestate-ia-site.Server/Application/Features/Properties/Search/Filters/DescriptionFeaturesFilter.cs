using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Features.Properties.Analysis;
using realestate_ia_site.Server.Application.Common.Context;

namespace realestate_ia_site.Server.Application.Features.Properties.Search.Filters
{
    /// <summary>
    /// Filtro que usa IA para analisar descrições e encontrar features específicas.
    /// Permite pesquisas como: "apartamento com varanda virada a sul", "casa com piscina e jardim"
    /// </summary>
    public class DescriptionFeaturesFilter : IPropertyFilter
    {
        private readonly IPropertyDescriptionAnalyzer _analyzer;
        private readonly UserRequestContext _userContext;
        private readonly ILogger<DescriptionFeaturesFilter> _logger;

        public DescriptionFeaturesFilter(
            IPropertyDescriptionAnalyzer analyzer,
            UserRequestContext userContext,
            ILogger<DescriptionFeaturesFilter> logger)
        {
            _analyzer = analyzer;
            _userContext = userContext;
            _logger = logger;
        }

        public bool CanHandle(string filterKey) => filterKey == "features" || filterKey == "description_features";

        public string GetFilterName() => nameof(DescriptionFeaturesFilter);

        public async Task<IQueryable<Property>> ApplyAsync(
            IQueryable<Property> query,
            Dictionary<string, object> filters,
            CancellationToken cancellationToken = default)
        {
            if (!filters.TryGetValue("features", out var featuresObj) && 
                !filters.TryGetValue("description_features", out featuresObj))
                return query;

            if (featuresObj == null)
                return query;

            var requestedFeatures = ParseFeatures(featuresObj);
            if (!requestedFeatures.Any())
                return query;

            _logger.LogInformation(
                "[DescriptionFeaturesFilter] Procurando features: {Features}",
                string.Join(", ", requestedFeatures));

            // Limitar propriedades baseado no plano
            var maxProperties = _userContext.IsPremium ? 30 : 15;
            var properties = await query
                .Where(p => p.Description != null && p.Description != "")
                .Take(maxProperties)
                .ToListAsync(cancellationToken);

            if (!properties.Any())
                return query.Where(p => false);

            // Analisar em batches
            var matchedPropertyIds = new List<string>();
            var propertyFeatures = new Dictionary<string, List<string>>();
            var batchSize = _userContext.IsPremium ? 8 : 5;

            for (int i = 0; i < properties.Count; i += batchSize)
            {
                var batch = properties.Skip(i).Take(batchSize).ToList();
                
                var matchTasks = batch.Select(async p =>
                {
                    try
                    {
                        var (matchScore, foundFeatures) = await _analyzer.MatchFeaturesAsync(
                            p.Description!,
                            requestedFeatures,
                            cancellationToken);

                        if (matchScore >= 0.5)
                            return (p.Id, matchScore, foundFeatures);

                        return (null, 0.0, new List<string>());
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, 
                            "[DescriptionFeaturesFilter] Erro propriedade {PropertyId}", p.Id);
                        return (null, 0.0, new List<string>());
                    }
                });

                var batchResults = await Task.WhenAll(matchTasks);
                foreach (var result in batchResults.Where(r => r.Item1 != null))
                {
                    matchedPropertyIds.Add(result.Item1!);
                    propertyFeatures[result.Item1!] = result.Item3;
                }

                // Delay entre batches (menor para premium)
                if (i + batchSize < properties.Count)
                {
                    await Task.Delay(_userContext.IsPremium ? 200 : 400, cancellationToken);
                }
            }
            
            if (propertyFeatures.Any())
                filters["_matched_features"] = propertyFeatures;

            if (!matchedPropertyIds.Any())
            {
                _logger.LogInformation("[DescriptionFeaturesFilter] Nenhuma propriedade com features");
                return query.Where(p => false);
            }

            _logger.LogInformation(
                "[DescriptionFeaturesFilter] {Count} propriedades com features", matchedPropertyIds.Count);

            return query.Where(p => matchedPropertyIds.Contains(p.Id));
        }

        private List<string> ParseFeatures(object? featuresObj)
        {
            if (featuresObj == null)
                return new List<string>();

            // Se já é uma lista, retornar diretamente
            if (featuresObj is List<string> list)
                return list;

            // Se é IEnumerable<string>, converter para lista
            if (featuresObj is IEnumerable<string> enumerable)
                return enumerable.ToList();

            // Se é string, fazer parse
            var featuresString = featuresObj.ToString();
            if (string.IsNullOrWhiteSpace(featuresString))
                return new List<string>();

            // Suporta tanto array JSON quanto string separada por vírgulas
            if (featuresString.TrimStart().StartsWith("["))
            {
                try
                {
                    var features = System.Text.Json.JsonSerializer.Deserialize<List<string>>(featuresString);
                    return features ?? new List<string>();
                }
                catch
                {
                    // Fallback para split por vírgula
                }
            }

            return featuresString
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList();
        }
    }
}
