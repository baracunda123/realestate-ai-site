using OpenAI.Chat;
using realestate_ia_site.Server.Application.DTOs.PropertySearch;
using realestate_ia_site.Server.Application.AI.Interfaces;
using realestate_ia_site.Server.Infrastructure.AI.Core;
using realestate_ia_site.Server.Application.AI.Conversation;

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
            => await GenerateResponseAsync(originalQuery, properties, string.Empty, cancellationToken);

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
                var hasValidSession = !string.IsNullOrWhiteSpace(sessionId);
                ConversationContext? context = null;

                if (hasValidSession)
                {
                    context = await _contextService.GetOrCreateContextAsync(sessionId, cancellationToken);
                    context.AddUserMessage(originalQuery);
                    _contextService.UpdateContext(sessionId, context);
                }

                var messages = BuildMessages(originalQuery, properties, context);
                var response = await GenerateAIResponseAsync(messages, cancellationToken);

                if (hasValidSession && context != null)
                {
                    context.AddAssistantMessage(response);
                    _contextService.UpdateContext(sessionId, context);
                }

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

        private List<ChatMessage> BuildMessages(
            string originalQuery,
            List<PropertySearchDto> properties,
            ConversationContext? context)
        {
            List<ChatMessage>? conversationHistory = null;
            bool isRefinement = false;

            if (context != null)
            {
                conversationHistory = context.GetRecentMessages().ToList();
                isRefinement = context.Messages.Count > 2;
            }

            return PromptBuilder.BuildForResponse(originalQuery, properties, conversationHistory, isRefinement);
        }

        private async Task<string> GenerateAIResponseAsync(
            List<ChatMessage> messages,
            CancellationToken cancellationToken)
        {
            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 1200,     // Suficiente, sem ser verboso demais
                Temperature = 0.5f,             // Profissional mas natural
                TopP = 0.9f,                    // Mais focado em informações relevantes
                FrequencyPenalty = 0.3f,        // Mantém (evita repetir "imóvel", "propriedade")
                PresencePenalty = 0.2f          // Menos divagação, mais objetivo
            };

            return await _openAIService.CompleteChatAsync(messages, options, cancellationToken);
        }
    }
}