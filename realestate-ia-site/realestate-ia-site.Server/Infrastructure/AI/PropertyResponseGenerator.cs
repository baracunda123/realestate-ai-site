using OpenAI.Chat;
using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.Common.Context;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using realestate_ia_site.Server.Infrastructure.AI.Core;
using realestate_ia_site.Server.Application.Features.AI.Conversation;
using System.Text;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public sealed class PropertyResponseGenerator : IPropertyResponseGenerator
    {
        private readonly IOpenAIService _openAIService;
        private readonly UserRequestContext _userContext;
        private readonly ILogger<PropertyResponseGenerator> _logger;

        // Limites de propriedades para AI
        private const int MAX_PROPERTIES_FOR_AI = 100;
        private const int HIGH_VOLUME_THRESHOLD = 500;

        public PropertyResponseGenerator(
            IOpenAIService openAIService,
            UserRequestContext userContext,
            ILogger<PropertyResponseGenerator> logger)
        {
            _openAIService = openAIService;
            _userContext = userContext;
            _logger = logger;
        }

        /// <summary>
        /// Gera resposta conversacional usando contexto de conversa
        /// </summary>
        public async Task<string> GenerateResponseAsync(
            string originalQuery,
            List<PropertySearchDto> properties,
            ConversationContext? context,
            CancellationToken cancellationToken = default)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(originalQuery, nameof(originalQuery));
            ArgumentNullException.ThrowIfNull(properties, nameof(properties));

            _logger.LogInformation("Gerando resposta para {Count} propriedades", properties.Count);

            try
            {
                // Se houver muitas propriedades, retornar resposta simples sem AI
                if (properties.Count >= HIGH_VOLUME_THRESHOLD)
                {
                    var simpleResponse = GenerateLargeResultSetResponse(originalQuery, properties.Count);
                    _logger.LogInformation("Resposta simples gerada para {Count} propriedades (acima do limite)", properties.Count);
                    return simpleResponse;
                }

                // Limitar propriedades para AI se necessário
                var propertiesForAI = properties.Count > MAX_PROPERTIES_FOR_AI 
                    ? properties.Take(MAX_PROPERTIES_FOR_AI).ToList()
                    : properties;

                var messages = BuildMessages(originalQuery, propertiesForAI, context);
                var response = await GenerateAIResponseAsync(messages, cancellationToken);

                _logger.LogInformation("Resposta gerada com sucesso. Tamanho: {ResponseLength} caracteres", response.Length);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao gerar resposta. Pergunta: {Pergunta}, Propriedades: {Count}", originalQuery, properties.Count);
                throw;
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
            var ignoreKeys = new[] { "_matched_features" }; // Metadados internos, não são filtros reais
            
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

            var model = _userContext.IsPremium ? "gpt-4o" : "gpt-4o-mini";
            return await _openAIService.CompleteChatAsync(messages, options, model, cancellationToken);
        }

        /// <summary>
        /// Gera resposta simples para grandes volumes de resultados sem usar AI
        /// </summary>
        private string GenerateLargeResultSetResponse(string query, int propertyCount)
        {
            var response = new StringBuilder();
            response.AppendLine($"🔍 Encontrei **{propertyCount} propriedades** que correspondem à sua pesquisa.");
            response.AppendLine();
            
            // Sugestões baseadas no volume
            if (propertyCount > 2000)
            {
                response.AppendLine("ℹ️ **Muitas opções encontradas!** Para facilitar sua busca:");
                response.AppendLine("- Seja mais específico sobre a localização (bairro, rua)");
                response.AppendLine("- Defina um intervalo de preço");
                response.AppendLine("- Especifique o número de quartos");
                response.AppendLine("- Adicione características importantes (garagem, varanda, etc.)");
            }
            else if (propertyCount > 1000)
            {
                response.AppendLine("💡 **Dica:** Com tantas opções, tente refinar adicionando:");
                response.AppendLine("- Preço máximo");
                response.AppendLine("- Características específicas");
                response.AppendLine("- Área mínima");
            }
            else
            {
                response.AppendLine("📊 **Encontrei várias opções!** Para encontrar o imóvel ideal:");
                response.AppendLine("- Use filtros de preço e quartos");
                response.AppendLine("- Especifique características desejadas");
            }
            
            response.AppendLine();
            response.AppendLine("🔄 **Pode pedir para:**");
            response.AppendLine("- Ordenar por preço (menor/maior)");
            response.AppendLine("- Ordenar por área (menor/maior)");
            response.AppendLine("- Mostrar apenas com fotos");
            response.AppendLine("- Filtrar por tipo específico");

            _logger.LogInformation(
                "Resposta simples gerada para {Count} propriedades (acima do limite de {Threshold})",
                propertyCount,
                HIGH_VOLUME_THRESHOLD);

            return response.ToString();
        }
    }
}
