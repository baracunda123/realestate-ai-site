using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using realestate_ia_site.Server.DTOs.SearchAI;
using realestate_ia_site.Server.Services.AIServices;
using realestate_ia_site.Server.Services.PropertyServices;

namespace realestate_ia_site.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SearchAIController : ControllerBase
    {
        private readonly OpenAIService _openAI;
        private readonly PropertySearchService _property;
        private readonly ILogger<SearchAIController> _logger;
        private readonly PropertyAISearchService _propertyAI;

        public SearchAIController(OpenAIService openAI, PropertySearchService property, ILogger<SearchAIController> logger,PropertyAISearchService propertyAI)
        {
            _openAI = openAI;
            _property = property;
            _logger = logger;
            _propertyAI = propertyAI;
        }

        [HttpPost]
        public async Task<IActionResult> Search([FromBody] SearchAIRequestDto request)
        {
            _logger.LogInformation("Iniciando pesquisa AI com query: {Query}", request.Query);
            
            try
            {
                _logger.LogDebug("Interpretando texto com OpenAI...");
                var filters = await _openAI.InterpretTextAsync(request.Query);
                _logger.LogInformation("Interpretação concluída. Filtros extraídos: {@Filters}", filters);

                _logger.LogDebug("Buscando propriedades com filtros...");
                //var properties = await _property.SearchPropertiesWithFiltersAsync(filters);
                var properties = await _propertyAI.SearchPropertiesWithFiltersAsync(filters);
                _logger.LogInformation("Busca concluída. Encontradas {PropertyCount} propriedades", properties.Count);

                _logger.LogDebug("Gerando resposta do chatbot...");
                var resposta = await _openAI.ResponderComoChatbotAsync(request.Query, properties);
                _logger.LogInformation("Resposta gerada com sucesso. Tamanho: {ResponseLength} caracteres", resposta.Length);

                _logger.LogInformation("Pesquisa AI concluída com sucesso para query: {Query}", request.Query);
                return Ok(resposta);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Erro durante pesquisa AI. Query: {Query}", request.Query);
                return StatusCode(500, "Erro interno do servidor durante a pesquisa");
            }
        }
    }
}
