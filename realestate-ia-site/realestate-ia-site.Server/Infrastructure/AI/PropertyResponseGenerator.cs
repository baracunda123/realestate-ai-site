using OpenAI.Chat;
using realestate_ia_site.Server.DTOs;
using realestate_ia_site.Server.Infrastructure.AI.Interfaces;
using realestate_ia_site.Server.Infrastructure.AI.Prompts; // ADDED

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public sealed class PropertyResponseGenerator : IPropertyResponseGenerator
    {
        private readonly IOpenAIService _openAIService;
        private readonly IConversationContextService _contextService;
        private readonly ILogger<PropertyResponseGenerator> _logger;

        public PropertyResponseGenerator(
            IOpenAIService openAIService, 
            IConversationContextService contextService,
            ILogger<PropertyResponseGenerator> logger)
        {
            _openAIService = openAIService;
            _contextService = contextService;
            _logger = logger;
        }

        public async Task<string> GenerateResponseAsync(
            string originalQuery, 
            List<PropertySearchDto> properties, 
            CancellationToken cancellationToken = default)
        {
            return await GenerateResponseAsync(originalQuery, properties, string.Empty, cancellationToken);
        }

        public async Task<string> GenerateResponseAsync(
            string originalQuery, 
            List<PropertySearchDto> properties, 
            string sessionId,
            CancellationToken cancellationToken = default)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(originalQuery, nameof(originalQuery));
            ArgumentNullException.ThrowIfNull(properties, nameof(properties));

            _logger.LogInformation("Gerando resposta para: {Question}. Propriedades: {PropertyCount}, Sessão: {SessionId}", 
                originalQuery, properties.Count, sessionId);

            try
            {
                var messages = await BuildMessagesAsync(originalQuery, properties, sessionId, cancellationToken);
                var response = await GenerateAIResponseAsync(messages, cancellationToken);
                
                await UpdateContextWithResponseAsync(sessionId, originalQuery, response, cancellationToken);
                
                _logger.LogInformation("Resposta gerada com sucesso. Tamanho: {ResponseLength} caracteres", response.Length);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao gerar resposta. Pergunta: {Question}, Propriedades: {PropertyCount}", 
                    originalQuery, properties.Count);
                return "Desculpa, ocorreu um erro ao processar o teu pedido. Tenta novamente.";
            }
        }

        private async Task<List<ChatMessage>> BuildMessagesAsync(
            string originalQuery,
            List<PropertySearchDto> properties,
            string sessionId,
            CancellationToken cancellationToken)
        {
            var messages = new List<ChatMessage>();

            if (!string.IsNullOrWhiteSpace(sessionId))
            {
                var context = await _contextService.GetOrCreateContextAsync(sessionId, cancellationToken);
                context.AddUserMessage(originalQuery);
                messages = context.GetRecentMessages().ToList();
            }
            else
            {
                messages.Add(new SystemChatMessage(AiPrompts.UnifiedPropertyAssistant));
                messages.Add(new UserChatMessage(originalQuery));
            }

            var propertiesList = FormatPropertiesForAI(properties);
            messages.Add(new SystemChatMessage($"Propriedades disponíveis:\n{propertiesList}"));

            return messages;
        }

        private async Task<string> GenerateAIResponseAsync(
            List<ChatMessage> messages,
            CancellationToken cancellationToken)
        {
            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 800,
                Temperature = 0.3f
            };

            return await _openAIService.CompleteChatAsync(messages, options, cancellationToken);
        }

        private async Task UpdateContextWithResponseAsync(
            string sessionId,
            string originalQuery,
            string response,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(sessionId)) return;

            var context = await _contextService.GetOrCreateContextAsync(sessionId, cancellationToken);
            context.AddAssistantMessage(response);
            _contextService.UpdateContext(sessionId, context);
        }

        private static string FormatPropertiesForAI(List<PropertySearchDto> properties)
        {
            if (!properties.Any())
                return "Nenhuma propriedade encontrada para os critérios especificados.";

            return string.Join("\n", properties.Select((p, index) =>
            {
                var num = index + 1;
                var type = string.IsNullOrWhiteSpace(p.Type) ? "Imóvel" : p.Type;
                var loc = string.IsNullOrWhiteSpace(p.Location) ? "localização não indicada" : p.Location;
                var price = p.Price > 0 ? $"€{p.Price:N0}" : "preço sob consulta";
                var rooms = p.Bedrooms > 0 ? $"{p.Bedrooms} quartos" : null;
                var area = p.Area > 0 ? $"{p.Area:N0} m²" : null;
                var title = string.IsNullOrWhiteSpace(p.Title) ? null : p.Title;
                var parts = new[] { type, "em " + loc, rooms, area, price }
                    .Where(s => !string.IsNullOrWhiteSpace(s));
                var core = string.Join(", ", parts);
                var tail = string.IsNullOrWhiteSpace(p.ImageUrl) ? "" : $" ({p.ImageUrl})";
                return $"PROP[{num}] {core}{(title != null ? $" - {title}" : "")}{tail}";
            }));
        }
    }
}