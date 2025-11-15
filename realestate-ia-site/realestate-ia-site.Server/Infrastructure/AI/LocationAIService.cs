using OpenAI.Chat;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using realestate_ia_site.Server.Infrastructure.AI.Core;
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
            => await GetNearbyLocationsAsync(location, "free", cancellationToken);

        public async Task<List<string>> GetNearbyLocationsAsync(string location, string userPlan, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Obtendo localizações próximas para: {Location}, Plano: {Plan}", location, userPlan);
            var messages = PromptBuilder.BuildForLocationExpansion(location);

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 300,
                Temperature = 0.3f
            };

            try
            {
                var model = _openAIService.GetModelForPlan(userPlan);
                var jsonResponse = await _openAIService.CompleteChatAsync(messages, options, model, cancellationToken);
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

        public async Task<List<string>> GetLocationsBetweenAsync(string location1, string location2, CancellationToken cancellationToken = default)
            => await GetLocationsBetweenAsync(location1, location2, "free", cancellationToken);

        public async Task<List<string>> GetLocationsBetweenAsync(string location1, string location2, string userPlan, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Obtendo localizações ENTRE: {Location1} e {Location2}, Plano: {Plan}", location1, location2, userPlan);
            
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"TAREFA: Lista localizações em Portugal numa REGIÃO GEOGRÁFICA definida por dois pontos.
                    
                    REGRAS:
                    - Incluir localizações NO CAMINHO entre os dois pontos
                    - Incluir localizações PRÓXIMAS (até 30km) de cada ponto
                    - Incluir localizações na ÁREA GEOGRÁFICA entre os dois pontos
                    - Validar distâncias reais usando conhecimento geográfico de Portugal
                    - NUNCA sugerir localizações a mais de 50km de distância da região
                    - Máximo 12 localizações
                    
                    Exemplos:
                    'Setúbal' e 'Leiria' → [""Santarém"", ""Torres Novas"", ""Rio Maior"", ""Caldas da Rainha"", ""Alcobaça"", ""Palmela"", ""Sesimbra"", ""Marinha Grande""]
                    'Lisboa' e 'Porto' → [""Santarém"", ""Coimbra"", ""Aveiro"", ""Leiria"", ""Pombal"", ""Cascais"", ""Sintra"", ""Matosinhos"", ""Vila Nova de Gaia""]
                    'Rio Tinto' e 'Guimarães' → [""Maia"", ""Matosinhos"", ""Gondomar"", ""Valongo"", ""Santo Tirso"", ""Trofa"", ""Paços de Ferreira"", ""Vizela"", ""Braga""]
                    
                    Responde APENAS com array JSON: [""loc1"", ""loc2"", ...]"),
                new UserChatMessage($"Localizações na região entre '{location1}' e '{location2}'")
            };

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 300,
                Temperature = 0.3f
            };

            try
            {
                var model = _openAIService.GetModelForPlan(userPlan);
                var jsonResponse = await _openAIService.CompleteChatAsync(messages, options, model, cancellationToken);
                var locations = JsonSerializer.Deserialize<List<string>>(jsonResponse);

                _logger.LogInformation("IA encontrou {Count} localizações entre {Location1} e {Location2}: {BetweenLocations}",
                    locations?.Count ?? 0, location1, location2, string.Join(", ", locations ?? new List<string>()));

                return locations ?? new List<string>();
            }
            catch (JsonException jsonEx)
            {
                _logger.LogWarning(jsonEx, "Erro ao deserializar resposta da IA para localizações entre. Location1: {Location1}, Location2: {Location2}", 
                    location1, location2);
                return new List<string>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter localizações entre via IA. Location1: {Location1}, Location2: {Location2}", 
                    location1, location2);
                return new List<string>();
            }
        }
    }
}
