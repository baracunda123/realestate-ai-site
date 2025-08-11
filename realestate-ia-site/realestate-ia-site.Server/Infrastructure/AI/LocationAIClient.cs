using OpenAI;
using OpenAI.Chat;
using System.Text.Json;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public class LocationAIClient
    {
        private readonly OpenAI.OpenAIClient _client;
        private readonly string _modelo;
        private readonly ILogger<LocationAIClient> _logger;

        public LocationAIClient(IConfiguration config, ILogger<LocationAIClient> logger)
        {
            _logger = logger;
            var apiKey = config["OpenAI:ApiKey"];
            _modelo = config["OpenAI:Model"] ?? "gpt-3.5-turbo";
            _client = new OpenAI.OpenAIClient(apiKey);
        }

        public async Task<List<string>> GetNearbyLocationsAsync(string location , CancellationToken cancellationToken = default)
        {
            _logger.LogDebug("Solicitando localizações próximas para: {Location}", location);

            cancellationToken.ThrowIfCancellationRequested();

            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um especialista em geografia de Portugal. 
                                        Dado um nome de cidade/localidade, retorna uma lista JSON de cidades próximas (máximo 5).
                                        Considera:
                                        - Cidades no mesmo distrito
                                        - Cidades num raio de 30km aproximadamente
                                        - Variações do nome (ex: Porto = Oporto)
                                        - Áreas metropolitanas
                                        
                                        Retorna APENAS um array JSON simples como:
                                        [""cidade1"", ""cidade2"", ""cidade3""]
                                        
                                        Se não conheces a localização, retorna um array vazio: []"),
                new UserChatMessage($"Localização: {location}")
            };

            var chatCompletionOptions = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 200,
                Temperature = 0.1f // Baixa temperatura para respostas mais consistentes
            };

            try
            {
                var response = await _client.GetChatClient(_modelo).CompleteChatAsync(messages, chatCompletionOptions , cancellationToken);
                var jsonResponse = response.Value.Content[0].Text.Trim();

                _logger.LogDebug("Resposta da IA para localizações próximas: {Response}", jsonResponse);

                // Parse do JSON
                var locations = JsonSerializer.Deserialize<List<string>>(jsonResponse);

                _logger.LogInformation("IA encontrou {Count} localizações próximas para {Location}: {NearbyLocations}",
                    locations?.Count ?? 0, location, string.Join(", ", locations ?? new List<string>()));

                return locations ?? new List<string>();
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Interpretação cancelada para a location: {Location}", location);
                throw;
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