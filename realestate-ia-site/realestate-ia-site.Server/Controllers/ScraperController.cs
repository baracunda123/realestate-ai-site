using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using realestate_ia_site.Server.DTOs.Scraper;
using realestate_ia_site.Server.Services.PropertyServices;

namespace realestate_ia_site.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ScraperController : ControllerBase
    {
        private readonly ILogger<ScraperController> _logger;
        private readonly PropertyImportService _propertyImportService;

        public ScraperController(ILogger<ScraperController> logger, PropertyImportService propertyImportService)
        {
            _logger = logger;
            _propertyImportService = propertyImportService;
        }

        [HttpPost]
        public async Task<IActionResult> ImportData([FromBody] ScrapperPropertyDto[] scrapperPropertyDto)
        {
            _logger.LogInformation("🏠 Recebida requisição de importação com {Count} propriedades", scrapperPropertyDto.Length);
            //_logger.LogInformation("Conteudo recebido {Conteudo}", scrapperPropertyDto);

            try
            {
                var result = await _propertyImportService.ImportScrapperPropertiesAsync(scrapperPropertyDto);
                
                _logger.LogInformation("✅ Importação finalizada com sucesso. Total: {Total}, Criadas: {Created}, Atualizadas: {Updated}, Erros: {Errors}", 
                    result.Total, result.Created, result.Updated, result.Errors);
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Erro crítico durante importação de propriedades");
                return StatusCode(500, new { message = "Erro interno durante a importação", details = ex.Message });
            }
        }
    }
}
