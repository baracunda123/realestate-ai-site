using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using realestate_ia_site.Server.Application.SearchAI;
using realestate_ia_site.Server.Application.DTOs.SearchAI;
using realestate_ia_site.Server.Application.Common.Events;
using realestate_ia_site.Server.Domain.Events;
using realestate_ia_site.Server.Application.AI.Interfaces;

namespace realestate_ia_site.Server.Controllers
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

        public SearchAIController(
            ILogger<SearchAIController> logger, 
            SearchAIOrchestrator orchestrator,
            IDomainEventDispatcher eventDispatcher,
            IConversationContextService conversationContextService)
        {
            _logger = logger;
            _orchestrator = orchestrator;
            _eventDispatcher = eventDispatcher;
            _conversationContextService = conversationContextService;
        }

        [HttpPost]
        [ProducesResponseType(typeof(SearchAIResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
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

                _logger.LogInformation("Pesquisa AI iniciada. UserId: {UserId}, SessionId: {SessionId}, Query: {Query}",
                    userId, sessionId, request.Query);

                request.SessionId = sessionId;
                var result = await _orchestrator.HandleAsync(request, ct);

                // NOVO: Disparar evento de pesquisa executada para tracking comportamental
                var searchEvent = new SearchExecutedEvent
                {
                    UserId = userId,
                    SessionId = sessionId,
                    SearchQuery = request.Query,
                    Filters = result.ExtractedFilters, // Filtros extraídos pela IA (localização, tipo, etc.)
                    ResultsCount = result.Properties?.Count ?? 0,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString()
                };

                try
                {
                    await _eventDispatcher.PublishAsync(searchEvent, ct);
                }
                catch (Exception ex)
                {
                    // Log do erro mas não falha a pesquisa
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
