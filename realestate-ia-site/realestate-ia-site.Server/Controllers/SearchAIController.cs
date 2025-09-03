using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using realestate_ia_site.Server.Application.SearchAI;
using realestate_ia_site.Server.DTOs.SearchAI;
using System.ComponentModel.DataAnnotations;

namespace realestate_ia_site.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize] // Força autenticação JWT obrigatória
    public class SearchAIController : BaseController
    {
        private readonly ILogger<SearchAIController> _logger;
        private readonly SearchAIOrchestrator _orchestrator;

        public SearchAIController(ILogger<SearchAIController> logger, SearchAIOrchestrator orchestrator)
        {
            _logger = logger;
            _orchestrator = orchestrator;
        }

        [HttpPost]
        [ProducesResponseType(typeof(SearchAIResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)] //  Documentar 401
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<SearchAIResponseDto>> Search(
            [FromBody] SearchAIRequestDto request,
            CancellationToken ct = default) //  Adicionar default
        {
            //  Validação mais robusta
            if (request == null)
                return BadRequest("Request não pode ser nulo.");

            if (string.IsNullOrWhiteSpace(request.Query))
                return BadRequest("Query é obrigatória.");

            // Validação adicional
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
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                var sessionId = GetSessionId(); //   logs de erro
                _logger.LogError(ex, "Erro durante pesquisa AI. SessionId: {SessionId}", sessionId);
                return StatusCode(500, "Erro interno do servidor");
            }
        }
    }
}
