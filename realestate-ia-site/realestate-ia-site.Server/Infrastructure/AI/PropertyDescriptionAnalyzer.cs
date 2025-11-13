using realestate_ia_site.Server.Application.Features.Properties.Analysis;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using OpenAI.Chat;
using System.Text.Json;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    /// <summary>
    /// Usa IA para analisar descrições de propriedades e extrair features específicas.
    /// Permite pesquisas muito mais detalhadas como:
    /// - "apartamento com varanda virada a sul"
    /// - "casa com jardim e piscina"
    /// - "imóvel renovado recentemente"
    /// </summary>
    public class PropertyDescriptionAnalyzer : IPropertyDescriptionAnalyzer
    {
        private readonly IOpenAIService _openAIService;
        private readonly ILogger<PropertyDescriptionAnalyzer> _logger;

        // Cache em memória para evitar análises repetidas da mesma descrição
        private readonly Dictionary<string, List<string>> _featureCache = new();
        private readonly SemaphoreSlim _cacheLock = new(1, 1);

        public PropertyDescriptionAnalyzer(
            IOpenAIService openAIService,
            ILogger<PropertyDescriptionAnalyzer> logger)
        {
            _openAIService = openAIService;
            _logger = logger;
        }

        public async Task<List<string>> ExtractFeaturesAsync(
            string description, 
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(description))
                return new List<string>();

            // Verificar cache
            var cacheKey = GetCacheKey(description);
            await _cacheLock.WaitAsync(cancellationToken);
            try
            {
                if (_featureCache.TryGetValue(cacheKey, out var cachedFeatures))
                {
                    _logger.LogDebug("[DescriptionAnalyzer] Features encontradas em cache");
                    return cachedFeatures;
                }
            }
            finally
            {
                _cacheLock.Release();
            }

            // Extrair features com IA
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um especialista em análise de anúncios imobiliários.

TAREFA: Extrai características específicas e detalhes importantes da descrição.

Categorias a procurar:
- Características estruturais: varanda, terraço, jardim, piscina, garagem, arrecadação, sótão, cave
- Orientação solar: nascente, poente, sul, norte
- Estado: renovado, remodelado, novo, a necessitar de obras
- Vistas: mar, serra, cidade, rio
- Equipamentos: ar condicionado, aquecimento central, painéis solares, elevador
- Acabamentos: cozinha equipada, roupeiros embutidos, pavimento flutuante, vidros duplos
- Localização: centro, periferia, zona calma, perto de transportes, perto de escolas

Responde APENAS com array JSON de features encontradas: [""feature1"", ""feature2"", ...]
Usa termos curtos e claros em português."),
                
                new UserChatMessage($"Descrição:\n{description}")
            };

            var chatOptions = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 300,
                Temperature = 0.2f // Baixa temperatura para consistência
            };

            try
            {
                var response = await _openAIService.CompleteChatAsync(
                    messages,
                    chatOptions,
                    "gpt-4o-mini", // Modelo rápido e eficiente
                    cancellationToken);

                // Extrair JSON se estiver envolto em markdown code blocks
                var jsonContent = ExtractJsonFromMarkdown(response);
                var jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var features = JsonSerializer.Deserialize<List<string>>(jsonContent, jsonOptions) ?? new List<string>();
                
                _logger.LogInformation(
                    "[DescriptionAnalyzer] Extraídas {Count} features da descrição", 
                    features.Count);

                // Guardar em cache
                await _cacheLock.WaitAsync(cancellationToken);
                try
                {
                    _featureCache[cacheKey] = features;
                    
                    // Limitar tamanho do cache (últimas 1000 descrições)
                    if (_featureCache.Count > 1000)
                    {
                        var oldestKey = _featureCache.Keys.First();
                        _featureCache.Remove(oldestKey);
                    }
                }
                finally
                {
                    _cacheLock.Release();
                }

                return features;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[DescriptionAnalyzer] Erro ao extrair features");
                return new List<string>();
            }
        }

        public async Task<(double matchScore, List<string> foundFeatures)> MatchFeaturesAsync(
            string description,
            List<string> requestedFeatures,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(description) || !requestedFeatures.Any())
                return (0.0, new List<string>());

            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um especialista em matching de características imobiliárias.

TAREFA: Verifica APENAS se a descrição contém as características SOLICITADAS pelo utilizador.
Considera sinónimos e variações (ex: ""terraço"" = ""varanda grande"", ""renovado"" = ""remodelado"").

IMPORTANTE: Retorna APENAS as features que foram SOLICITADAS e que EXISTEM na descrição.
NÃO incluas features que não foram solicitadas, mesmo que existam na descrição.

Responde APENAS com JSON:
{
  ""matchScore"": 0.0-1.0,
  ""foundFeatures"": [""feature1"", ...]
}

matchScore: percentagem de features SOLICITADAS que foram encontradas (0.0 = nenhuma, 1.0 = todas)
foundFeatures: lista APENAS das features SOLICITADAS que foram encontradas na descrição"),
                
                new UserChatMessage($@"Features solicitadas: {string.Join(", ", requestedFeatures)}

Descrição da propriedade:
{description}")
            };

            var chatOptions = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 200,
                Temperature = 0.1f // Muito baixa para matching preciso
            };

            try
            {
                var response = await _openAIService.CompleteChatAsync(
                    messages,
                    chatOptions,
                    "gpt-4o-mini",
                    cancellationToken);

                // Extrair JSON se estiver envolto em markdown code blocks
                var jsonContent = ExtractJsonFromMarkdown(response);
                
                _logger.LogDebug(
                    "[DescriptionAnalyzer] JSON extraído para parse: {Json}",
                    jsonContent);
                
                // Configurar opções para case-insensitive deserialization
                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };
                var result = JsonSerializer.Deserialize<MatchResult>(jsonContent, jsonOptions);
                
                if (result != null)
                {
                    _logger.LogInformation(
                        "[DescriptionAnalyzer] Match score: {Score:P0}, Features solicitadas: {Requested}, Features encontradas: {Found}",
                        result.MatchScore,
                        string.Join(", ", requestedFeatures),
                        string.Join(", ", result.FoundFeatures));

                    return (result.MatchScore, result.FoundFeatures);
                }
                
                _logger.LogWarning("[DescriptionAnalyzer] Deserialização retornou null! JSON: {Json}", jsonContent);
                return (0.0, new List<string>());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[DescriptionAnalyzer] Erro ao fazer matching de features");
                return (0.0, new List<string>());
            }
        }

        private string GetCacheKey(string description)
        {
            // Usar hash da descrição como chave (primeiros 200 chars para performance)
            var truncated = description.Length > 200 
                ? description.Substring(0, 200) 
                : description;
            
            return Convert.ToBase64String(
                System.Text.Encoding.UTF8.GetBytes(truncated))
                .Substring(0, Math.Min(32, truncated.Length));
        }

        /// <summary>
        /// Extrai JSON de markdown code blocks (```json ... ```) se presente
        /// </summary>
        private static string ExtractJsonFromMarkdown(string response)
        {
            if (string.IsNullOrWhiteSpace(response))
                return response;

            // Verificar se tem markdown code block
            var trimmed = response.Trim();
            if (trimmed.StartsWith("```"))
            {
                // Remover ```json ou ``` do início
                var lines = trimmed.Split('\n');
                var jsonLines = lines.Skip(1).Take(lines.Length - 2).ToArray();
                return string.Join("\n", jsonLines);
            }

            return response;
        }

        private class MatchResult
        {
            public double MatchScore { get; set; }
            public List<string> FoundFeatures { get; set; } = new();
        }
    }
}
