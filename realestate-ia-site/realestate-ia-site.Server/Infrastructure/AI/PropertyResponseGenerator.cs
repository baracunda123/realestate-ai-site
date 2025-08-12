using OpenAI.Chat;
using realestate_ia_site.Server.DTOs;
using realestate_ia_site.Server.Infrastructure.AI.Interfaces;

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
            // Manter compatibilidade para chamadas sem sessionId
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

            // Se temos sessionId, usar contexto da conversa
            if (!string.IsNullOrWhiteSpace(sessionId))
            {
                var context = await _contextService.GetOrCreateContextAsync(sessionId, cancellationToken);
                context.AddUserMessage(originalQuery);
                messages = context.GetRecentMessages().ToList();
            }
            else
            {
                // Fallback para comportamento sem contexto
                messages.Add(new SystemChatMessage(GetStandaloneSystemPrompt()));
                messages.Add(new UserChatMessage(originalQuery));
            }

            // Adicionar informação sobre propriedades disponíveis
            var propertiesList = FormatPropertiesForAI(properties);
            messages.Add(new SystemChatMessage($"Imóveis disponíveis para esta pesquisa:\n{propertiesList}"));

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

            return string.Join("\n", properties.Select(p =>
                $"[{p.Id}] {p.Type} em {p.Location}, {p.Bedrooms} quartos, € {p.Price:N0}, imageURL:{p.ImageUrl}"));
        }

        private static string GetStandaloneSystemPrompt()
        {
            return @"És um assistente imobiliário em Portugal.

                    REGRAS OBRIGATÓRIAS:
                    1) LISTA FECHADA: Só podes apresentar imóveis que constam na lista fornecida.
                    2) TIPOLOGIA: Se o utilizador procurar T2, considera também T3 como opção, apresentando primeiro todos os T2 (se existirem) e depois todos os T3 como ""resultados semelhantes"".
                    3) FORMATO: Apresenta cada propriedade com: tipo, localização, quartos, preço.
                    4) LINGUAGEM: Usa português natural e amigável.";
        }
    }
}