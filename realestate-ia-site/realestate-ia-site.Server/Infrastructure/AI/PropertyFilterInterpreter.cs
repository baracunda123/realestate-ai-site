using OpenAI.Chat;
using realestate_ia_site.Server.Infrastructure.AI.Interfaces;
using System.Text.Json;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public class PropertyFilterInterpreter : IPropertyFilterInterpreter
    {
        private readonly IOpenAIService _openAIService;
        private readonly ILogger<PropertyFilterInterpreter> _logger;

        public PropertyFilterInterpreter(IOpenAIService openAIService, ILogger<PropertyFilterInterpreter> logger)
        {
            _openAIService = openAIService;
            _logger = logger;
        }

        public async Task<Dictionary<string, object>> ExtractFiltersAsync(string userQuery, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Extraindo filtros do texto: {Input}", userQuery);

            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(GetFilterExtractionPrompt()),
                new UserChatMessage(userQuery)
            };

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 500,
                Temperature = 0.3f
            };

            try
            {
                var jsonResponse = await _openAIService.CompleteChatAsync(messages, options, cancellationToken);
                var filters = JsonSerializer.Deserialize<Dictionary<string, object>>(jsonResponse);
                
                _logger.LogInformation("Filtros extraídos com sucesso: {FilterCount}", filters?.Count ?? 0);
                _logger.LogDebug("🔍 Filtros detalhados: {@Filters}", filters);
                
                return filters ?? new Dictionary<string, object>();
            }
            catch (JsonException jsonEx)
            {
                _logger.LogError(jsonEx, "Erro ao deserializar resposta JSON. Input: {Input}", userQuery);
                return new Dictionary<string, object>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao extrair filtros. Input: {Input}", userQuery);
                return new Dictionary<string, object>();
            }
        }

        private static string GetFilterExtractionPrompt()
        {
            return @"Extrai filtros de imóveis a partir da frase do utilizador.
                    Responde **apenas** com JSON válido (um único objeto). NÃO incluas texto fora do JSON.

                    Campos suportados (não inventar chaves novas):
                    - type (string)                // ex.: 'apartamento', 'moradia'
                    - location (string)            // ex.: 'Lisboa', 'Porto, Foz'
                    - max_price (number)           // em euros; se o user disser 300k/300 mil, interpretar como 300000
                    - rooms (number)               // número mínimo de quartos
                    - tags (string[])              // ex.: ['varanda','piscina','garagem']
                    - sort (string)                // 'price_asc' | 'price_desc' | 'relevance' (default)
                    - cheaper_hint (boolean)       // true se o user disser 'mais barato', 'em conta', 'abaixa o preço' sem valor

                    Regras:
                    - Deteta expressões de preço como '300k', '300 mil', '300.000€' e normaliza para número (euros).
                    - Se o utilizador disser 'mais barato' (ou sinónimos) e NÃO der um valor, define cheaper_hint=true e sort='price_asc'.
                    - Se disser 'mais caro', define sort='price_desc' e cheaper_hint=false.
                    - Se não for especificado, usa sort='relevance'.
                    - Normaliza strings para PT (sem maiúsculas desnecessárias). Não retornes campos nulos; simplesmente omite.
                    - Nunca retornes explicações, apenas o JSON.

                    Exemplos:
                    Input: 'agora quero mais barato'
                    Output: { ""sort"": ""price_asc"", ""cheaper_hint"": true }

                    Input: 'até 300k em Lisboa, T3 com varanda'
                    Output: { ""location"": ""Lisboa"", ""rooms"": 3, ""max_price"": 300000, ""tags"": [""varanda""], ""sort"": ""relevance"" }

                    Input: 'quero algo mais caro no Porto, com garagem'
                    Output: { ""location"": ""Porto"", ""tags"": [""garagem""], ""sort"": ""price_desc"", ""cheaper_hint"": false }";
        }
    }
}