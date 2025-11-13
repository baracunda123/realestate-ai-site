using OpenAI.Chat;
using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using realestate_ia_site.Server.Infrastructure.AI.Core;
using realestate_ia_site.Server.Application.Features.AI.Conversation;

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
            => await GenerateResponseAsync(originalQuery, properties, sessionId, "free", cancellationToken);

        public async Task<string> GenerateResponseAsync(
            string originalQuery,
            List<PropertySearchDto> properties,
            string sessionId,
            string userPlan,
            CancellationToken cancellationToken = default)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(originalQuery, nameof(originalQuery));
            ArgumentNullException.ThrowIfNull(properties, nameof(properties));

            _logger.LogInformation("Gerando resposta para: {Question}. Propriedades: {PropertyCount}, Sessão: {SessionId}, Plano: {Plan}",
                originalQuery, properties.Count, sessionId, userPlan);

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
                var response = await GenerateAIResponseAsync(messages, userPlan, cancellationToken);

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
                
                // Verificar se é realmente um refinamento (adicionar critérios)
                // e não uma mudança completa (trocar localização, tipo, etc.)
                isRefinement = IsActualRefinement(context);
            }

            return PromptBuilder.BuildForResponse(originalQuery, properties, conversationHistory, isRefinement);
        }
        
        /// <summary>
        /// Determina se é um refinamento real (adicionar critérios) ou mudança completa.
        /// Analisa o comportamento do utilizador comparando filtros anteriores com atuais.
        /// </summary>
        private bool IsActualRefinement(ConversationContext context)
        {
            // Precisa ter pelo menos 2 mensagens (1 pergunta anterior + resposta)
            if (context.Messages.Count <= 2)
                return false;
            
            var currentFilters = context.LastFilters;
            if (!currentFilters.Any())
                return false;
            
            // Obter filtros da mensagem anterior (se existir)
            var previousFilters = GetPreviousFilters(context);
            if (previousFilters == null || !previousFilters.Any())
            {
                // Primeira pesquisa com filtros - não é refinamento
                return false;
            }
            
            // Analisar mudanças entre filtros anteriores e atuais
            var analysis = AnalyzeFilterChanges(previousFilters, currentFilters);
            
            // Critérios para considerar refinamento:
            // 1. Adicionou novos critérios SEM mudar os principais (localização, tipo)
            // 2. Acumulou features
            // 3. Ajustou ranges (preço, área) sem mudar drasticamente
            
            bool isRefinement = 
                analysis.AddedFilters > 0 && // Adicionou algo
                !analysis.ChangedCoreFilters && // NÃO mudou localização/tipo
                (analysis.RemovedFilters == 0 || analysis.AddedFilters > analysis.RemovedFilters); // Mais adições que remoções
            
            if (isRefinement)
            {
                _logger.LogInformation(
                    "[Refinamento] Detectado - Adicionou: {Added}, Mudou: {Changed}, Removeu: {Removed}, Core: {Core}",
                    analysis.AddedFilters,
                    analysis.ChangedFilters,
                    analysis.RemovedFilters,
                    analysis.ChangedCoreFilters ? "Mudou" : "Manteve");
            }
            else
            {
                _logger.LogInformation(
                    "[Mudança Completa] Detectada - Adicionou: {Added}, Mudou: {Changed}, Removeu: {Removed}, Core: {Core}",
                    analysis.AddedFilters,
                    analysis.ChangedFilters,
                    analysis.RemovedFilters,
                    analysis.ChangedCoreFilters ? "Mudou" : "Manteve");
            }
            
            return isRefinement;
        }
        
        /// <summary>
        /// Obtém os filtros da pesquisa anterior (antes da última)
        /// </summary>
        private Dictionary<string, object>? GetPreviousFilters(ConversationContext context)
        {
            // Obter do histórico de filtros
            if (!context.FilterHistory.Any())
                return null;
            
            // Retornar os últimos filtros guardados (antes da fusão atual)
            return context.FilterHistory.Last();
        }
        
        /// <summary>
        /// Analisa as mudanças entre filtros anteriores e atuais
        /// </summary>
        private FilterChangeAnalysis AnalyzeFilterChanges(
            Dictionary<string, object> previous, 
            Dictionary<string, object> current)
        {
            var analysis = new FilterChangeAnalysis();
            var coreFilterKeys = new[] { "location", "city", "type", "property_type" };
            var ignoreKeys = new[] { "session_id", "user_query", "_matched_features" };
            
            // Filtros adicionados
            foreach (var key in current.Keys.Except(ignoreKeys))
            {
                if (!previous.ContainsKey(key))
                {
                    analysis.AddedFilters++;
                    
                    if (coreFilterKeys.Contains(key))
                        analysis.ChangedCoreFilters = true;
                }
                else if (!AreFiltersEqual(previous[key], current[key]))
                {
                    analysis.ChangedFilters++;
                    
                    if (coreFilterKeys.Contains(key))
                        analysis.ChangedCoreFilters = true;
                }
            }
            
            // Filtros removidos
            foreach (var key in previous.Keys.Except(ignoreKeys))
            {
                if (!current.ContainsKey(key))
                {
                    analysis.RemovedFilters++;
                    
                    if (coreFilterKeys.Contains(key))
                        analysis.ChangedCoreFilters = true;
                }
            }
            
            return analysis;
        }
        
        /// <summary>
        /// Compara dois valores de filtro para igualdade
        /// </summary>
        private bool AreFiltersEqual(object value1, object value2)
        {
            if (value1 is List<string> list1 && value2 is List<string> list2)
            {
                return list1.SequenceEqual(list2);
            }
            
            return value1.Equals(value2);
        }
        
        /// <summary>
        /// Resultado da análise de mudanças de filtros
        /// </summary>
        private class FilterChangeAnalysis
        {
            public int AddedFilters { get; set; }
            public int ChangedFilters { get; set; }
            public int RemovedFilters { get; set; }
            public bool ChangedCoreFilters { get; set; }
        }

        private async Task<string> GenerateAIResponseAsync(
            List<ChatMessage> messages,
            string userPlan,
            CancellationToken cancellationToken)
        {
            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 1200,
                Temperature = 0.5f,
                TopP = 0.9f,
                FrequencyPenalty = 0.3f,
                PresencePenalty = 0.2f
            };

            // Obter modelo baseado no plano do usuário
            var model = _openAIService.GetModelForPlan(userPlan);
            _logger.LogInformation("Usando modelo {Model} para plano {Plan}", model, userPlan);

            return await _openAIService.CompleteChatAsync(messages, options, model, cancellationToken);
        }
    }
}
