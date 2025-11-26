using Microsoft.OpenApi.Services;
using OpenAI.Chat;
using realestate_ia_site.Server.Application.Common.Context;
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
        private readonly UserRequestContext _userContext;
        
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
            UserRequestContext userContext,
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
            _userContext = userContext;
            _advancedInterpreter = advancedInterpreter;
            _semanticAnalyzer = semanticAnalyzer;
            _recommendationEngine = recommendationEngine;
            _feedbackService = feedbackService;
            _logger = logger;
        }

        public async Task<SearchAIResponseDto> HandleAsync(SearchAIRequestDto request, CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(request, nameof(request));
            ArgumentException.ThrowIfNullOrWhiteSpace(request.Query, nameof(request.Query));

            _logger.LogInformation("Processing search request: {Query}, SessionId: {SessionId}", request.Query, request.SessionId);
            
            try
            {
                // ========== 1. OBTER CONTEXTO (única vez) ==========
                // Restaura da BD se necessário - filtros e histórico mantidos entre sessões
                var context = await _contextService.GetOrCreateContextAsync(request.SessionId);
                
                // Guardar filtros anteriores para aprendizagem
                Dictionary<string, object>? previousFilters = null;
                if (context != null && context.LastFilters.Any())
                {
                    previousFilters = new Dictionary<string, object>(context.LastFilters);
                }
                
                // ========== 2. DETETAR MUDANÇA DE INTENÇÃO ==========
                // Se o utilizador mudou completamente de contexto, limpar filtros anteriores
                if (_advancedInterpreter != null && context != null && context.Messages.Any())
                {
                    try
                    {
                        // Obter última query do utilizador (antes da atual)
                        var lastUserMessage = context.Messages
                            .Where(m => m is UserChatMessage)
                            .LastOrDefault();
                        
                        if (lastUserMessage != null)
                        {
                            var previousQuery = lastUserMessage.Content.FirstOrDefault()?.Text ?? string.Empty;
                            
                            if (!string.IsNullOrEmpty(previousQuery))
                            {
                                var intentChange = await _advancedInterpreter.DetectIntentChangeAsync(
                                    previousQuery,
                                    request.Query,
                                    ct);
                                
                                // Se mudança completa ou contradição, limpar filtros anteriores
                                if (intentChange.ChangeType == "mudança_completa" || 
                                    intentChange.ChangeType == "contradição")
                                {
                                    _logger.LogInformation(
                                        "[IntentChange] Mudança de contexto detetada ({Type}) - Limpando filtros anteriores. Razão: {Reason}",
                                        intentChange.ChangeType,
                                        intentChange.LikelyReason);
                                    
                                    previousFilters = null;
                                    context.LastFilters.Clear();
                                    context.FilterHistory.Clear();
                                }
                                else if (intentChange.ChangeType == "mudança_parcial")
                                {
                                    _logger.LogInformation(
                                        "[IntentChange] Mudança parcial detetada - Mantendo alguns filtros. Mudou: {Changed}",
                                        string.Join(", ", intentChange.WhatChanged ?? new List<string>()));
                                }
                                else
                                {
                                    _logger.LogDebug(
                                        "[IntentChange] Refinamento detetado - Mantendo contexto completo");
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[IntentChange] Falha ao detetar mudança de intenção - continuando com contexto atual");
                    }
                }
                
                // ========== 3. ADICIONAR MENSAGEM DO UTILIZADOR AO CONTEXTO ==========
                // Fazer isto ANTES de qualquer análise para que a IA tenha contexto completo
                if (context != null)
                {
                    context.AddUserMessage(request.Query);
                }
                
                // ========== 4. INTERPRETAR QUERY COMPLEXA (Premium) ==========
                ComplexQueryInterpretation? complexInterpretation = null;
                if (_advancedInterpreter != null && IsComplexQuery(request.Query) && _userContext.IsPremium)
                {
                    try
                    {
                        // Usar últimas 6 mensagens (inclui a atual que acabámos de adicionar)
                        var conversationHistory = context?.Messages.TakeLast(6) ?? Enumerable.Empty<ChatMessage>();

                        _logger.LogInformation("[Advanced] Interpretando query complexa com {Count} mensagens de contexto", 
                            conversationHistory.Count());

                        complexInterpretation = await _advancedInterpreter.InterpretComplexQueryAsync(
                            request.Query, 
                            conversationHistory,
                            ct);
                        
                        _logger.LogInformation("[Advanced] Query complexa interpretada com {Confidence}/10 de confiança", 
                            complexInterpretation.InterpretationConfidence);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[Advanced] Falha ao interpretar query complexa - usando sistema padrão");
                    }
                }
                
                // ========== 5. OBTER PADRÕES DE COMPORTAMENTO (se disponível) ==========
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
                
                // ========== 6. ANALISAR INTENÇÃO DO UTILIZADOR ==========
                UserIntentAnalysis? userIntent = null;
                if (_semanticAnalyzer != null)
                {
                    try
                    {
                        // Usar últimas 6 mensagens (inclui a atual)
                        var conversationHistory = context?.Messages.TakeLast(6) ?? Enumerable.Empty<ChatMessage>();
                        
                        userIntent = await _semanticAnalyzer.AnalyzeUserIntentAsync(
                            request.Query,
                            conversationHistory,
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
                
                // ========== 7. EXTRAIR FILTROS (usando contexto já carregado) ==========
                // A intenção enriquece os filtros com features contextuais (segurança, família, etc.)
                var filters = await _filterInterpreter.ExtractFiltersAsync(request.Query, context, userIntent, ct);
                var properties = await _propertySearchService.SearchPropertiesWithFiltersAsync(filters, ct);
                
                // ========== 8. ATUALIZAR CONTEXTO COM FILTROS ==========
                if (context != null && filters != null && filters.Any())
                {
                    // Guardar filtros anteriores no histórico
                    if (previousFilters != null && previousFilters.Any())
                    {
                        context.FilterHistory.Add(previousFilters);
                        
                        // Limitar histórico a últimas 10 pesquisas
                        if (context.FilterHistory.Count > 10)
                        {
                            context.FilterHistory.RemoveAt(0);
                        }
                    }
                    
                    context.LastFilters = filters;
                }
                
                // ========== 9. GERAR RESPOSTA (usando contexto já carregado) ==========
                var aiResponse = await _responseGenerator.GenerateResponseAsync(request.Query, properties, context, ct);
                
                // ========== 10. PERGUNTAS INTELIGENTES (se sem resultados) ==========
                if (!properties.Any() && _recommendationEngine != null && userIntent != null)
                {
                    try
                    {
                        var conversationHistory = context?.Messages.TakeLast(6) ?? Enumerable.Empty<ChatMessage>();
                        
                        var smartQuestions = await _recommendationEngine.GenerateSmartQuestionsAsync(
                            userIntent,
                            conversationHistory,
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
                
                // ========== 11. SUGERIR REFINAMENTOS (se poucos resultados) ==========
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

                // ========== 12. APRENDER COM COMPORTAMENTO ==========
                if (previousFilters != null && filters != null && request.UserId != null)
                {
                    await _scoringService.LearnFromRefinementAsync(
                        request.SessionId,
                        request.UserId,
                        previousFilters,
                        filters,
                        ct);
                }
                
                // ========== 13. ADICIONAR RESPOSTA AO CONTEXTO E PERSISTIR ==========
                if (context != null)
                {
                    context.AddAssistantMessage(aiResponse);
                    _contextService.UpdateContext(request.SessionId, context);
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
