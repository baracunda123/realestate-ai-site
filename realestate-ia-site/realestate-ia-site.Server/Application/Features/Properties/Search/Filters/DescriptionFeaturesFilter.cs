using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Features.Properties.Analysis;

namespace realestate_ia_site.Server.Application.Features.Properties.Search.Filters
{
    /// <summary>
    /// Filtro que usa IA para analisar descrições e encontrar features específicas.
    /// Permite pesquisas como: "apartamento com varanda virada a sul", "casa com piscina e jardim"
    /// </summary>
    public class DescriptionFeaturesFilter : IPropertyFilter
    {
        private readonly IPropertyDescriptionAnalyzer _analyzer;
        private readonly ILogger<DescriptionFeaturesFilter> _logger;

        public DescriptionFeaturesFilter(
            IPropertyDescriptionAnalyzer analyzer,
            ILogger<DescriptionFeaturesFilter> logger)
        {
            _analyzer = analyzer;
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

            // Parse features solicitadas
            var requestedFeatures = ParseFeatures(featuresObj);
            if (!requestedFeatures.Any())
                return query;

            _logger.LogInformation(
                "[DescriptionFeaturesFilter] Procurando por features: {Features}",
                string.Join(", ", requestedFeatures));

            // OTIMIZAÇÃO: Limitar a 20 propriedades para análise (evitar timeout)
            // Buscar apenas as primeiras 20 propriedades com descrição
            var properties = await query
                .Where(p => p.Description != null && p.Description != "")
                .Take(20) // Limitar para evitar timeout
                .ToListAsync(cancellationToken);

            if (!properties.Any())
                return query.Where(p => false); // Retorna query vazia

            _logger.LogInformation(
                "[DescriptionFeaturesFilter] Analisando {Count} propriedades (máx 20)",
                properties.Count);

            // Analisar descrições em paralelo (batch de 5 por vez para não sobrecarregar a API)
            var matchedPropertyIds = new List<string>();
            var propertyFeatures = new Dictionary<string, List<string>>(); // Mapear PropertyId -> Features encontradas
            var batchSize = 5; // Reduzido de 10 para 5 para melhor controle

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

                        // Considerar match se pelo menos 50% das features foram encontradas
                        if (matchScore >= 0.5)
                        {
                            _logger.LogDebug(
                                "[DescriptionFeaturesFilter] Match encontrado: {PropertyId}, Score: {Score:P0}, Features: {Features}",
                                p.Id,
                                matchScore,
                                string.Join(", ", foundFeatures));

                            return (p.Id, matchScore, foundFeatures);
                        }

                        return (null, 0.0, new List<string>());
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, 
                            "[DescriptionFeaturesFilter] Erro ao analisar propriedade {PropertyId}",
                            p.Id);
                        return (null, 0.0, new List<string>());
                    }
                });

                var batchResults = await Task.WhenAll(matchTasks);
                foreach (var result in batchResults.Where(r => r.Item1 != null))
                {
                    matchedPropertyIds.Add(result.Item1!);
                    propertyFeatures[result.Item1!] = result.Item3;
                }

                // Delay entre batches para não sobrecarregar a API e evitar timeouts
                if (i + batchSize < properties.Count)
                {
                    await Task.Delay(500, cancellationToken); // Aumentado de 100ms para 500ms
                }
            }
            
            // Guardar features encontradas no filtro para uso posterior
            if (propertyFeatures.Any())
            {
                filters["_matched_features"] = propertyFeatures;
            }

            if (!matchedPropertyIds.Any())
            {
                _logger.LogInformation(
                    "[DescriptionFeaturesFilter] Nenhuma propriedade encontrada com as features solicitadas");
                return query.Where(p => false); // Retorna query vazia
            }

            _logger.LogInformation(
                "[DescriptionFeaturesFilter] {Count} propriedades encontradas com as features",
                matchedPropertyIds.Count);

            // Retornar apenas propriedades que deram match
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
