using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using realestate_ia_site.Server.Application.Chat.Interfaces;
using realestate_ia_site.Server.Application.Features.AI.SearchAI;
using realestate_ia_site.Server.Application.Features.AI.SearchAI.DTOs;
using realestate_ia_site.Server.Application.Features.Chat.DTOs;
using realestate_ia_site.Server.Application.Features.Chat.Interfaces;

namespace realestate_ia_site.Server.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("SearchPolicy")] // 30 req/min para proteger contra abuso
    public class SearchAIController : BaseController
    {
        private readonly ILogger<SearchAIController> _logger;
        private readonly SearchAIOrchestrator _orchestrator;
        private readonly IChatUsageService _chatUsageService;
        private readonly IChatSessionService _chatSessionService;
        private readonly IChatSessionPropertyService _chatSessionPropertyService;

        public SearchAIController(
            ILogger<SearchAIController> logger, 
            SearchAIOrchestrator orchestrator,
            IChatUsageService chatUsageService,
            IChatSessionService chatSessionService,
            IChatSessionPropertyService chatSessionPropertyService)
        {
            _logger = logger;
            _orchestrator = orchestrator;
            _chatUsageService = chatUsageService;
            _chatSessionService = chatSessionService;
            _chatSessionPropertyService = chatSessionPropertyService;
        }

        [HttpPost]
        [ProducesResponseType(typeof(SearchAIResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status429TooManyRequests)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<SearchAIResponseDto>> Search(
            [FromBody] SearchAIRequestDto request,
            CancellationToken ct = default)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var userId = GetCurrentUserId(); // Pode ser null para anónimos
                var isAuthenticated = !string.IsNullOrEmpty(userId);

                string userPlan;
                string chatSessionId = request.SessionId;
                var userMessageResult = null as AddMessageResultDto;

                if (isAuthenticated)
                {
                    // UTILIZADOR AUTENTICADO - Com histórico persistente e sessões na BD
                    
                    // Criar nova sessão se não foi fornecido sessionId
                    // Isto garante que cada nova conversa começa com uma sessão limpa
                    if (string.IsNullOrEmpty(chatSessionId))
                    {
                        var newSession = await _chatSessionService.CreateSessionAsync(userId!, "Nova Conversa", ct);
                        chatSessionId = newSession.Id;
                        request.SessionId = chatSessionId;
                        _logger.LogInformation("Nova sessão criada automaticamente no backend: {SessionId}", chatSessionId);
                    }
                    
                    // Adicionar UserId ao request para análise de comportamento
                    request.UserId = userId;

                    // Persistir mensagem do utilizador
                    userMessageResult = await _chatSessionService.AddMessageAsync(chatSessionId, "user", request.Query!, ct);

                    // Determinar plano: verificar se tem subscrição ativa (Premium) ou não (Free)
                    var hasActiveSubscription = await _chatUsageService.GetUsageStatsAsync(userId!, ct);
                    userPlan = hasActiveSubscription.HasActiveSubscription ? "premium" : "free";
                    
                    _logger.LogInformation("Pesquisa autenticada - UserId: {UserId}, Plano: {Plan}, SessionId: {SessionId}", 
                        userId, userPlan, chatSessionId);
                }
                else
                {
                    // UTILIZADOR ANÓNIMO - Histórico temporário em memória (não persistido na BD)
                    
                    // Usar sessionId do middleware para manter contexto conversacional em memória
                    var sessionId = GetSessionId();
                    if (string.IsNullOrEmpty(chatSessionId) && !string.IsNullOrEmpty(sessionId))
                    {
                        chatSessionId = sessionId;
                        request.SessionId = chatSessionId;
                    }
                    
                    userPlan = "free"; // Anónimos usam plano Free (GPT-4o-mini)
                    
                    _logger.LogInformation("Pesquisa anónima - Plano: Free (mini), SessionId: {SessionId}", 
                        chatSessionId ?? "none");
                }

                // Processar pesquisa (contexto conversacional é mantido para TODOS via ConversationContextService)
                var result = await _orchestrator.HandleAsync(request, userPlan, ct);

                // Apenas persistir histórico na BD para utilizadores autenticados
                if (isAuthenticated && !string.IsNullOrEmpty(chatSessionId))
                {
                    // Persistir resposta da IA
                    await _chatSessionService.AddMessageAsync(chatSessionId, "assistant", result.AIResponse, ct);

                    // Persistir propriedades retornadas na sessão (ou limpar se não houver resultados)
                    if (result.Properties != null && result.Properties.Any())
                    {
                        var propertyIds = result.Properties.Select(p => p.Id).ToList();
                        
                        // Extrair matched features de cada propriedade (se existirem)
                        var matchedFeatures = result.Properties
                            .Where(p => p.MatchedFeatures != null && p.MatchedFeatures.Any())
                            .ToDictionary(p => p.Id, p => p.MatchedFeatures!);
                        
                        await _chatSessionPropertyService.AddPropertiesToSessionAsync(
                            chatSessionId, 
                            propertyIds, 
                            matchedFeatures.Any() ? matchedFeatures : null, 
                            ct);
                        
                        _logger.LogInformation("Persistidas {Count} propriedades na sessão {SessionId} (com features: {FeaturesCount})", 
                            propertyIds.Count, chatSessionId, matchedFeatures.Count);
                    }
                    else
                    {
                        // Limpar propriedades anteriores quando não há resultados
                        await _chatSessionPropertyService.ClearSessionPropertiesAsync(chatSessionId, ct);
                        _logger.LogInformation("Nenhuma propriedade encontrada - sessão {SessionId} limpa", chatSessionId);
                    }
                }
 
                var response = new SearchAIResponseDto
                    {
                        Properties = result.Properties,
                        AIResponse = result.AIResponse,
                        ExtractedFilters = result.ExtractedFilters,
                        SessionId = chatSessionId,
                        SessionTitleUpdated = userMessageResult?.TitleUpdated ?? false,
                        UpdatedSessionTitle = userMessageResult?.UpdatedTitle,
                        IsAnonymous = !isAuthenticated
                    };


                return Ok(response);
            }
            catch (OperationCanceledException)
            {
                var userId = GetCurrentUserId();
                var sessionId = GetSessionId();
                _logger.LogInformation("Requisição cancelada pelo cliente - UserId: {UserId}, SessionId: {SessionId}", 
                    userId ?? "anonymous", sessionId ?? "none");
                
                // A mensagem do utilizador já foi persistida para autenticados
                // Adicionar mensagem de cancelamento para manter consistência do histórico
                try
                {
                    var chatSessionId = request.SessionId;
                    if (!string.IsNullOrEmpty(chatSessionId) && !string.IsNullOrEmpty(userId))
                    {
                        await _chatSessionService.AddMessageAsync(
                            chatSessionId, 
                            "assistant", 
                            "Mensagem cancelada.",
                            CancellationToken.None); // Usar CancellationToken.None para garantir que esta mensagem seja salva
                        
                        _logger.LogInformation("Mensagem de cancelamento adicionada ao histórico da sessão {SessionId}", chatSessionId);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Falha ao adicionar mensagem de cancelamento ao histórico");
                }
                
                // Quota NÃO é consumida quando cancelado - o utilizador não recebeu resposta completa
                
                return StatusCode(499, new { 
                    error = "REQUEST_CANCELLED",
                    message = "Requisição cancelada pelo cliente" 
                });
            }
            catch (Exception ex)
            {
                var userId = GetCurrentUserId();
                var sessionId = GetSessionId();
                _logger.LogError(ex, "Erro durante pesquisa AI - UserId: {UserId}, SessionId: {SessionId}", 
                    userId ?? "anonymous", sessionId ?? "none");
                return StatusCode(500, "Erro interno do servidor");
            }
        }

        /// <summary>
        /// Obter estatísticas de uso do chat do usuário (requer autenticação)
        /// </summary>
        [HttpGet("usage-stats")]
        [Authorize]
        [ProducesResponseType(typeof(ChatUsageStats), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ChatUsageStats>> GetUsageStats(CancellationToken ct = default)
        {
            try
            {
                var userId = GetCurrentUserId();
                var stats = await _chatUsageService.GetUsageStatsAsync(userId, ct);
                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter estatísticas de uso");
                return StatusCode(500, "Erro ao obter estatísticas");
            }
        }

    }
}
