using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using realestate_ia_site.Server.Application.SearchAI;
using realestate_ia_site.Server.DTOs.SearchAI;

namespace realestate_ia_site.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SearchAIController : ControllerBase
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
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<SearchAIResponseDto>> Search(
            [FromBody] SearchAIRequestDto request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request?.Query))
                return BadRequest("Query é obrigatória.");

            try
            {
                var result = await _orchestrator.HandleAsync(request, ct);
                return Ok(result); // <- já retorna properties + AIResponse
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Requisição cancelada pelo cliente.");
                return StatusCode(499); // ou 400/204, dependendo da convenção
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro interno durante pesquisa AI");
                return StatusCode(500, "Erro interno do servidor durante a pesquisa");
            }
        }
    }
}
