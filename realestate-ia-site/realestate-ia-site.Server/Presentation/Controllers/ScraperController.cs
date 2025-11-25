using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.Features.Properties.Import;

namespace realestate_ia_site.Server.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ScraperController : ControllerBase
    {
        private readonly ILogger<ScraperController> _logger;
        private readonly PropertyImportService _propertyImportService;

        public ScraperController(
            ILogger<ScraperController> logger, 
            PropertyImportService propertyImportService)
        {
            _logger = logger;
            _propertyImportService = propertyImportService;
        }

        [HttpPost("import-properties")]
        public async Task<IActionResult> ImportProperties([FromBody] ScraperPropertyDto[] request)
        {
            _logger.LogInformation("Received import request with {Count} properties", request.Length);
            //_logger.LogInformation("Received content {Content}", scrapperPropertyDto);

            try
            {
                var result = await _propertyImportService.ImportScrapperPropertiesAsync(request);
                
                _logger.LogInformation("Import completed successfully. Total: {Total}, Created: {Created}, Updated: {Updated}, Errors: {Errors}", 
                    result.Total, result.Created, result.Updated, result.Errors);
                
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Critical error during property import");
                return StatusCode(500, new { message = "Internal error during import", details = ex.Message });
            }
        }
    }
}


