using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using realestate_ia_site.Server.Application.SearchAI;
using realestate_ia_site.Server.Application.DTOs.SearchAI;
using realestate_ia_site.Server.Application.Common.Events;
using realestate_ia_site.Server.Domain.Events;
using realestate_ia_site.Server.Application.AI.Interfaces;
using realestate_ia_site.Server.Application.Chat.Interfaces;

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
        private readonly IConversationContextService _conversationContextService;
        private readonly IChatUsageService _chatUsageService;

        public SearchAIController(
            ILogger<SearchAIController> logger, 
            SearchAIOrchestrator orchestrator,
            IDomainEventDispatcher eventDispatcher,
            IConversationContextService conversationContextService,
            IChatUsageService chatUsageService)
        {
            _logger = logger;
            _orchestrator = orchestrator;
            _eventDispatcher = eventDispatcher;
            _conversationContextService = conversationContextService;
            _chatUsageService = chatUsageService;
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
            if (request == null)
                return BadRequest("Request não pode ser nulo.");

            if (string.IsNullOrWhiteSpace(request.Query))
                return BadRequest("Query é obrigatória.");

            if (request.Query.Length > 500)
                return BadRequest("Query não pode exceder 500 caracteres.");

            try
            {
                var sessionId = GetSessionIdOrThrow();
                var userId = GetCurrentUserId();

                // ? NOVA LÓGICA: Verificar quota antes de processar
                var hasQuota = await _chatUsageService.HasAvailableQuotaAsync(userId, ct);
                if (!hasQuota)
                {
                    _logger.LogWarning("Quota esgotada para usuário {UserId}", userId);
                    
                    // Obter estatísticas para retornar no erro
                    var stats = await _chatUsageService.GetUsageStatsAsync(userId, ct);
                    
                    return StatusCode(429, new
                    {
                        error = "Quota de chat esgotada",
                        message = $"Você atingiu o limite de {stats.MaxPrompts} mensagens do plano {stats.PlanType}. Faça upgrade para continuar.",
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

                _logger.LogInformation("Pesquisa AI iniciada. UserId: {UserId}, SessionId: {SessionId}, Query: {Query}",
                    userId, sessionId, request.Query);

                request.SessionId = sessionId;
                var result = await _orchestrator.HandleAsync(request, ct);

                // ? NOVA LÓGICA: Consumir quota APÓS sucesso
                var consumed = await _chatUsageService.ConsumePromptAsync(userId, ct);
                if (consumed)
                {
                    var stats = await _chatUsageService.GetUsageStatsAsync(userId, ct);
                    _logger.LogInformation(
                        "Quota consumida para usuário {UserId} - {Used}/{Max} ({Percentage:F1}%)",
                        userId, stats.UsedPrompts, stats.MaxPrompts, stats.UsagePercentage);
                }

                // NOVO: Disparar evento de pesquisa executada para tracking comportamental
                var searchEvent = new SearchExecutedEvent
                {
                    UserId = userId,
                    SessionId = sessionId,
                    SearchQuery = request.Query,
                    Filters = result.ExtractedFilters,
                    ResultsCount = result.Properties?.Count ?? 0,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                };

                try
                {
                    await _eventDispatcher.PublishAsync(searchEvent, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to publish search event for user {UserId}", userId);
                }

                return Ok(result);
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

        /// <summary>
        /// Limpar completamente o contexto da conversa IA para a sessão atual
        /// </summary>
        [HttpDelete("clear-context")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> ClearConversationContext(CancellationToken ct = default)
        {
            try
            {
                var sessionId = GetSessionIdOrThrow();
                var userId = GetCurrentUserId();

                _logger.LogInformation("Limpando contexto da conversa IA. UserId: {UserId}, SessionId: {SessionId}",
                    userId, sessionId);

                await _conversationContextService.ClearContextAsync(sessionId, ct);

                return Ok(new { success = true, message = "Contexto da conversa limpo com sucesso" });
            }
            catch (Exception ex)
            {
                var sessionId = GetSessionId();
                _logger.LogError(ex, "Erro ao limpar contexto da conversa. SessionId: {SessionId}", sessionId);
                return StatusCode(500, new { success = false, message = "Erro ao limpar contexto da conversa" });
            }
        }
    }
}


