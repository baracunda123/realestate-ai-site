using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using realestate_ia_site.Server.Application.Common.Events;
using realestate_ia_site.Server.Application.Features.AI.SearchAI;
using realestate_ia_site.Server.Application.Features.AI.SearchAI.DTOs;
using realestate_ia_site.Server.Application.Features.Chat.Interfaces;
using realestate_ia_site.Server.Application.Chat.Interfaces;
using realestate_ia_site.Server.Domain.Events;

namespace realestate_ia_site.Server.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SearchAIController : BaseController
    {
        private readonly ILogger<SearchAIController> _logger;
        private readonly SearchAIOrchestrator _orchestrator;
        private readonly IDomainEventDispatcher _eventDispatcher;
        private readonly IChatUsageService _chatUsageService;
        private readonly IChatSessionService _chatSessionService;
        private readonly IChatSessionPropertyService _chatSessionPropertyService;

        public SearchAIController(
            ILogger<SearchAIController> logger, 
            SearchAIOrchestrator orchestrator,
            IDomainEventDispatcher eventDispatcher,
            IChatUsageService chatUsageService,
            IChatSessionService chatSessionService,
            IChatSessionPropertyService chatSessionPropertyService)
        {
            _logger = logger;
            _orchestrator = orchestrator;
            _eventDispatcher = eventDispatcher;
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
                var sessionId = GetSessionIdOrThrow();
                var userId = GetCurrentUserId();

                // Verificar quota antes de processar
                var hasQuota = await _chatUsageService.HasAvailableQuotaAsync(userId, ct);
                if (!hasQuota)
                {
                    _logger.LogWarning("Quota esgotada para usuário {UserId}", userId);
                    
                    var stats = await _chatUsageService.GetUsageStatsAsync(userId, ct);
                    
                    return StatusCode(429, new
                    {
                        error = "QUOTA_EXCEEDED",
                        message = "Atingiu o limite de mensagens disponíveis no seu plano.",
                        code = "QUOTA_EXCEEDED",
                        stats = new
                        {
                            used = stats.UsedPrompts,
                            max = stats.MaxPrompts,
                            planType = stats.PlanType,
                            periodEnd = stats.PeriodEnd
                        }
                    });
                }

                // Obter ou criar sessão ativa se não foi fornecido sessionId
                string chatSessionId = request.SessionId;
                if (string.IsNullOrEmpty(chatSessionId))
                {
                    var activeSession = await _chatSessionService.GetOrCreateActiveSessionAsync(userId, ct);
                    chatSessionId = activeSession.Id;
                    request.SessionId = chatSessionId;
                }

                // Persistir mensagem do utilizador
                var userMessageResult = await _chatSessionService.AddMessageAsync(chatSessionId, "user", request.Query!, ct);

                // Obter plano do usuário
                var usageStats = await _chatUsageService.GetUsageStatsAsync(userId, ct);
                var userPlan = usageStats.PlanType ?? "free";

                // Processar pesquisa
                var result = await _orchestrator.HandleAsync(request, userPlan, ct);

                // Persistir resposta da IA
                await _chatSessionService.AddMessageAsync(chatSessionId, "assistant", result.AIResponse, ct);

                // Persistir propriedades retornadas na sessão
                if (result.Properties != null && result.Properties.Any())
                {
                    var propertyIds = result.Properties.Select(p => p.Id).ToList();
                    await _chatSessionPropertyService.AddPropertiesToSessionAsync(chatSessionId, propertyIds, ct);
                    _logger.LogInformation("Persistidas {Count} propriedades na sessão {SessionId}", propertyIds.Count, chatSessionId);
                }

                // Consumir quota
                var consumed = await _chatUsageService.ConsumePromptAsync(userId, ct);
                if (consumed)
                {
                    var stats = await _chatUsageService.GetUsageStatsAsync(userId, ct);
                    _logger.LogInformation(
                        "Quota consumida para usuário {UserId} - {Used}/{Max} ({Percentage:F1}%)",
                        userId, stats.UsedPrompts, stats.MaxPrompts, stats.UsagePercentage);
                }

                // Publicar evento de pesquisa
                await _eventDispatcher.PublishAsync(new SearchExecutedEvent
                {
                    UserId = userId,
                    SessionId = sessionId,
                    SearchQuery = request.Query!,
                    ResultsCount = result.Properties?.Count ?? 0,
                    Filters = result.ExtractedFilters
                }, ct);

                // Criar resposta com informação de sessão atualizada
                var response = new SearchAIResponseDto
                {
                    Properties = result.Properties,
                    AIResponse = result.AIResponse,
                    ExtractedFilters = result.ExtractedFilters,
                    SessionId = chatSessionId,
                    SessionTitleUpdated = userMessageResult.TitleUpdated,
                    UpdatedSessionTitle = userMessageResult.UpdatedTitle
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                var sessionId = GetSessionId();
                _logger.LogError(ex, "Erro durante pesquisa AI. SessionId: {SessionId}", sessionId);
                return StatusCode(500, "Erro interno do servidor");
            }
        }

        /// <summary>
        /// Obter estatísticas de uso do chat do usuário
        /// </summary>
        [HttpGet("usage-stats")]
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
