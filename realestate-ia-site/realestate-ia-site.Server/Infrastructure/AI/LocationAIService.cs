using OpenAI.Chat;
using realestate_ia_site.Server.Infrastructure.AI.Interfaces;
using System.Text.Json;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public class LocationAIService
    {
        private readonly IOpenAIService _openAIService;
        private readonly ILogger<LocationAIService> _logger;

        public LocationAIService(IOpenAIService openAIService, ILogger<LocationAIService> logger)
        {
            _openAIService = openAIService;
            _logger = logger;
        }

        public async Task<List<string>> GetNearbyLocationsAsync(string location, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Obtendo localizações próximas para: {Location}", location);

            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um especialista em geografia de Portugal. 
                                      Quando te for dada uma localização, responde com uma lista JSON de cidades/freguesias próximas.
                                      Inclui apenas localizações reais que existam em Portugal.
                                      Responde APENAS com o array JSON, sem explicações.
                                      
                                      Exemplo:
                                      Input: 'Foz'
                                      Output: [""Foz do Douro"", ""Aldoar"", ""Nevogilde"", ""Lordelo do Ouro"", ""Ramalde""]"),
                new UserChatMessage(location)
            };

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 300,
                Temperature = 0.3f
            };

            try
            {
                var jsonResponse = await _openAIService.CompleteChatAsync(messages, options, cancellationToken);
                var locations = JsonSerializer.Deserialize<List<string>>(jsonResponse);

                _logger.LogInformation("IA encontrou {Count} localizações próximas para {Location}: {NearbyLocations}",
                    locations?.Count ?? 0, location, string.Join(", ", locations ?? new List<string>()));

                return locations ?? new List<string>();
            }
            catch (JsonException jsonEx)
            {
                _logger.LogWarning(jsonEx, "Erro ao deserializar resposta da IA para localizações próximas. Location: {Location}", location);
                return new List<string>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter localizações próximas via IA. Location: {Location}", location);
                return new List<string>();
            }
        }
    }
}