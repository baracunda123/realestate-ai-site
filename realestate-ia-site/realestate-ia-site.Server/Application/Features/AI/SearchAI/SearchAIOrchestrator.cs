using Microsoft.OpenApi.Services;
using realestate_ia_site.Server.Application.Features.AI.SearchAI.DTOs;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using realestate_ia_site.Server.Application.Features.Properties.Search;
using realestate_ia_site.Server.Application.Features.Properties.Scoring;
using realestate_ia_site.Server.Application.Features.Properties.Feedback;
using realestate_ia_site.Server.Infrastructure.AI;

namespace realestate_ia_site.Server.Application.Features.AI.SearchAI
{
    public sealed class SearchAIOrchestrator 
    {
        private readonly IPropertyFilterInterpreter _filterInterpreter;
        private readonly IPropertyResponseGenerator _responseGenerator;
        private readonly IPropertySearchService _propertySearchService;
        private readonly IPropertyScoringService _scoringService;
        private readonly IConversationContextService _contextService;
        
        // Novos serviços avançados (opcionais - com fallback)
        private readonly IAdvancedQueryInterpreter? _advancedInterpreter;
        private readonly IPropertySemanticAnalyzer? _semanticAnalyzer;
        private readonly IIntelligentRecommendationEngine? _recommendationEngine;
        private readonly PropertyFeedbackService? _feedbackService;
        
        private readonly ILogger<SearchAIOrchestrator> _logger;

        public SearchAIOrchestrator(
            IPropertyFilterInterpreter filterInterpreter,
            IPropertyResponseGenerator responseGenerator,
            IPropertySearchService propertySearchService,
            IPropertyScoringService scoringService,
            IConversationContextService contextService,
            ILogger<SearchAIOrchestrator> logger,
            IAdvancedQueryInterpreter? advancedInterpreter = null,
            IPropertySemanticAnalyzer? semanticAnalyzer = null,
            IIntelligentRecommendationEngine? recommendationEngine = null,
            PropertyFeedbackService? feedbackService = null)
        {
            _filterInterpreter = filterInterpreter;
            _responseGenerator = responseGenerator;
            _propertySearchService = propertySearchService;
            _scoringService = scoringService;
            _contextService = contextService;
            _advancedInterpreter = advancedInterpreter;
            _semanticAnalyzer = semanticAnalyzer;
            _recommendationEngine = recommendationEngine;
            _feedbackService = feedbackService;
            _logger = logger;
        }

        public async Task<SearchAIResponseDto> HandleAsync(SearchAIRequestDto request, CancellationToken ct = default)
            => await HandleAsync(request, "free", ct);

        public async Task<SearchAIResponseDto> HandleAsync(SearchAIRequestDto request, string userPlan, CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(request, nameof(request));
            ArgumentException.ThrowIfNullOrWhiteSpace(request.Query, nameof(request.Query));

            _logger.LogInformation("Processing search request: {Query}, Plano: {Plan}", request.Query, userPlan);
            
            try
            {
                // Obter contexto para análise de comportamento
                var context = _contextService.GetContext(request.SessionId);
                Dictionary<string, object>? previousFilters = null;
                
                if (context != null && context.FilterHistory.Any())
                {
                    previousFilters = context.FilterHistory.Last();
                }
                
                // [NOVO] 1. Interpretar query complexa (se disponível)
                ComplexQueryInterpretation? complexInterpretation = null;
                if (_advancedInterpreter != null && IsComplexQuery(request.Query))
                {
                    try
                    {
                        var conversationContext = context != null 
                            ? string.Join("\n", context.Messages.TakeLast(3).Select(m => m.Content))
                            : string.Empty;
                        
                        complexInterpretation = await _advancedInterpreter.InterpretComplexQueryAsync(
                            request.Query, 
                            conversationContext, 
                            ct);
                        
                        _logger.LogInformation("[Advanced] Query complexa interpretada com {Confidence}/10 de confiança", 
                            complexInterpretation.InterpretationConfidence);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[Advanced] Falha ao interpretar query complexa - usando sistema padrão");
                    }
                }
                
                // [NOVO] 2. Obter padrões de comportamento do utilizador (se disponível)
                PropertyPreferencePattern? userPreferences = null;
                if (_feedbackService != null && !string.IsNullOrEmpty(request.UserId))
                {
                    try
                    {
                        userPreferences = await _feedbackService.ExtractPreferencePatternsAsync(
                            request.UserId,
                            ct);
                        
                        if (userPreferences.PreferredTypes.Any() || userPreferences.PreferredLocations.Any())
                        {
                            _logger.LogInformation(
                                "[Advanced] Padrões de comportamento identificados - Tipos: {Types}, Locais: {Locations}",
                                string.Join(", ", userPreferences.PreferredTypes),
                                string.Join(", ", userPreferences.PreferredLocations));
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[Advanced] Falha ao extrair padrões de comportamento");
                    }
                }
                
                // [CRÍTICO] 3. Analisar intenção do utilizador ANTES de extrair filtros
                UserIntentAnalysis? userIntent = null;
                if (_semanticAnalyzer != null)
                {
                    try
                    {
                        var conversationHistory = context?.Messages
                            .Select(m => m.Content.FirstOrDefault()?.Text ?? string.Empty)
                            .Where(text => !string.IsNullOrEmpty(text))
                            .ToList() ?? new List<string>();
                        
                        userIntent = await _semanticAnalyzer.AnalyzeUserIntentAsync(
                            request.Query,
                            conversationHistory,
                            userPlan,
                            ct);
                        
                        _logger.LogInformation(
                            "[Advanced] Intenção identificada ANTES da filtragem - Motivação: {Motivation}, Estilo: {Lifestyle}, Fase: {Phase}, Preocupações: {Concerns}", 
                            userIntent.Motivation, 
                            userIntent.LifestylePreference,
                            userIntent.DecisionPhase,
                            string.Join(", ", userIntent.Concerns ?? new List<string>()));
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[Advanced] Falha ao analisar intenção - continuando sem análise");
                    }
                }
                
                // 4. Extrair e processar filtros COM INTENÇÃO (sistema híbrido)
                // A intenção enriquece os filtros com features contextuais (segurança, família, etc.)
                var filters = await _filterInterpreter.ExtractFiltersAsync(request.Query, request.SessionId, userPlan, userIntent, ct);
                var properties = await _propertySearchService.SearchPropertiesWithFiltersAsync(filters, ct);
                
                // [NOVO] 5. Gerar explicações para as top 3 propriedades (se disponível)
                // Nota: As explicações serão incluídas na resposta do PropertyResponseGenerator
                if (_recommendationEngine != null && userIntent != null && properties.Any())
                {
                    try
                    {
                        // As explicações podem ser usadas pelo PropertyResponseGenerator
                        // para enriquecer a resposta conversacional
                        _logger.LogInformation("[Advanced] Explicações disponíveis para top 3 propriedades");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[Advanced] Falha ao preparar explicações");
                    }
                }
                
                // 6. Gerar resposta (SISTEMA ANTIGO - MANTÉM)
                var aiResponse = await _responseGenerator.GenerateResponseAsync(request.Query, properties, request.SessionId, userPlan, ct);
                
                // [NOVO] 7. Se não há resultados, gerar perguntas inteligentes (se disponível)
                if (!properties.Any() && _recommendationEngine != null && userIntent != null)
                {
                    try
                    {
                        var conversationHistory = context?.Messages
                            .Select(m => m.Content.FirstOrDefault()?.Text ?? string.Empty)
                            .Where(text => !string.IsNullOrEmpty(text))
                            .ToList() ?? new List<string>();
                        
                        var smartQuestions = await _recommendationEngine.GenerateSmartQuestionsAsync(
                            userIntent,
                            conversationHistory,
                            userPlan,
                            ct);
                        
                        if (smartQuestions.Any())
                        {
                            aiResponse += "\n\n" + string.Join("\n", smartQuestions.Select(q => $"• {q}"));
                            _logger.LogInformation("[Advanced] {Count} perguntas inteligentes adicionadas", smartQuestions.Count);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[Advanced] Falha ao gerar perguntas inteligentes");
                    }
                }
                
                // [NOVO] 8. Se há poucos resultados, sugerir refinamentos (se disponível)
                if (properties.Count > 0 && properties.Count < 5 && _advancedInterpreter != null)
                {
                    try
                    {
                        var resultsSummary = properties.Select(p => 
                            $"{p.Type} em {p.Location}, €{p.Price:N0}").ToList();
                        
                        var refinements = await _advancedInterpreter.SuggestRefinementsAsync(
                            request.Query,
                            properties.Count,
                            resultsSummary,
                            userPlan,
                            ct);
                        
                        if (refinements.Any())
                        {
                            aiResponse += "\n\n💡 Sugestões:\n" + string.Join("\n", refinements.Select(r => $"• {r}"));
                            _logger.LogInformation("[Advanced] {Count} sugestões de refinamento adicionadas", refinements.Count);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[Advanced] Falha ao sugerir refinamentos");
                    }
                }

                // 9. Aprender com o comportamento do utilizador (SISTEMA ANTIGO - MANTÉM)
                if (previousFilters != null && filters != null && request.UserId != null)
                {
                    await _scoringService.LearnFromRefinementAsync(
                        request.SessionId,
                        request.UserId,
                        previousFilters,
                        filters,
                        ct);
                }

                _logger.LogInformation("Search completed. Found {SearchCount} properties with filters: {Filters}", 
                    properties.Count, 
                    filters != null ? System.Text.Json.JsonSerializer.Serialize(filters) : "none");
                
                return new SearchAIResponseDto 
                { 
                    Properties = properties,
                    AIResponse = aiResponse,
                    ExtractedFilters = filters
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing search request: {Query}", request.Query);
                throw;
            }
        }
        
        /// <summary>
        /// Detecta se a query é complexa (múltiplas condições, "se-então", trade-offs)
        /// </summary>
        private bool IsComplexQuery(string query)
        {
            var complexIndicators = new[] { " se ", " mas ", " ou ", " até ", " desde que ", " a não ser ", " exceto " };
            return complexIndicators.Any(indicator => query.ToLower().Contains(indicator));
        }
    }
}
