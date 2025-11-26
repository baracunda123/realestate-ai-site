using realestate_ia_site.Server.Application.Features.Properties.Analysis;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using realestate_ia_site.Server.Application.Common.Context;
using OpenAI.Chat;
using System.Text.Json;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    /// <summary>
    /// Usa IA para analisar descrições de propriedades e encontrar features específicas.
    /// Permite pesquisas como: "apartamento com piscina", "casa com jardim"
    /// </summary>
    public class PropertyDescriptionAnalyzer : IPropertyDescriptionAnalyzer
    {
        private readonly IOpenAIService _openAIService;
        private readonly UserRequestContext _userContext;
        private readonly ILogger<PropertyDescriptionAnalyzer> _logger;

        // Cache em memória para evitar análises repetidas
        private readonly Dictionary<string, (double, List<string>)> _matchCache = new();
        private readonly SemaphoreSlim _cacheLock = new(1, 1);
        
        // Limite de caracteres para descrição (otimização de tokens)
        private const int MaxDescriptionLength = 500;

        public PropertyDescriptionAnalyzer(
            IOpenAIService openAIService,
            UserRequestContext userContext,
            ILogger<PropertyDescriptionAnalyzer> logger)
        {
            _openAIService = openAIService;
            _userContext = userContext;
            _logger = logger;
        }

        public async Task<(double matchScore, List<string> foundFeatures)> MatchFeaturesAsync(
            string description,
            List<string> requestedFeatures,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(description) || !requestedFeatures.Any())
                return (0.0, new List<string>());

            // Truncar descrição para economizar tokens
            var truncatedDescription = TruncateDescription(description);
            
            // Verificar cache
            var cacheKey = GetCacheKey(truncatedDescription, requestedFeatures);
            await _cacheLock.WaitAsync(cancellationToken);
            try
            {
                if (_matchCache.TryGetValue(cacheKey, out var cached))
                {
                    _logger.LogDebug("[DescriptionAnalyzer] Match encontrado em cache");
                    return cached;
                }
            }
            finally
            {
                _cacheLock.Release();
            }

            // Prompt otimizado para menos tokens
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"Verifica se a descrição contém as features solicitadas.
Considera sinónimos (terraço=varanda grande, renovado=remodelado).
Responde APENAS JSON: {""score"":0.0-1.0,""found"":[""feature1""]}
score=percentagem encontrada, found=features encontradas"),
                
                new UserChatMessage($"Features: {string.Join(", ", requestedFeatures)}\nDescrição: {truncatedDescription}")
            };

            var chatOptions = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 100,
                Temperature = 0.1f
            };

            try
            {
                var model = _userContext.IsPremium ? "gpt-4o" : "gpt-4o-mini";
                var response = await _openAIService.CompleteChatAsync(
                    messages,
                    chatOptions,
                    model,
                    cancellationToken);

                var jsonContent = ExtractJsonFromMarkdown(response);
                var jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var result = JsonSerializer.Deserialize<MatchResult>(jsonContent, jsonOptions);
                
                if (result != null)
                {
                    var matchResult = (result.Score, result.Found);
                    
                    _logger.LogDebug(
                        "[DescriptionAnalyzer] Match: {Score:P0}, Found: {Found}",
                        result.Score,
                        string.Join(", ", result.Found));

                    await CacheResultAsync(cacheKey, matchResult, cancellationToken);
                    return matchResult;
                }
                
                return (0.0, new List<string>());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[DescriptionAnalyzer] Erro ao fazer matching");
                return (0.0, new List<string>());
            }
        }

        private string TruncateDescription(string description)
        {
            if (description.Length <= MaxDescriptionLength)
                return description;
            
            // Truncar no último espaço antes do limite
            var truncated = description.Substring(0, MaxDescriptionLength);
            var lastSpace = truncated.LastIndexOf(' ');
            if (lastSpace > MaxDescriptionLength / 2)
                truncated = truncated.Substring(0, lastSpace);
            
            return truncated + "...";
        }

        private string GetCacheKey(string description, List<string> features)
        {
            var featuresKey = string.Join(",", features.OrderBy(f => f));
            var descKey = description.Length > 100 ? description.Substring(0, 100) : description;
            return $"{descKey.GetHashCode()}_{featuresKey.GetHashCode()}";
        }

        private async Task CacheResultAsync(string key, (double, List<string>) result, CancellationToken ct)
        {
            await _cacheLock.WaitAsync(ct);
            try
            {
                _matchCache[key] = result;
                
                // Limitar cache a 500 entradas
                if (_matchCache.Count > 500)
                {
                    var oldestKey = _matchCache.Keys.First();
                    _matchCache.Remove(oldestKey);
                }
            }
            finally
            {
                _cacheLock.Release();
            }
        }

        private static string ExtractJsonFromMarkdown(string response)
        {
            if (string.IsNullOrWhiteSpace(response))
                return response;

            var trimmed = response.Trim();
            if (trimmed.StartsWith("```"))
            {
                var lines = trimmed.Split('\n');
                var jsonLines = lines.Skip(1).Take(lines.Length - 2).ToArray();
                return string.Join("\n", jsonLines);
            }

            return response;
        }

        private class MatchResult
        {
            public double Score { get; set; }
            public List<string> Found { get; set; } = new();
        }
    }
}
