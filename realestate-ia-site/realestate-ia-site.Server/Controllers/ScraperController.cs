using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.DTOs.Scraper;
using realestate_ia_site.Server.Services.PropertyServices;
using realestate_ia_site.Server.Services.ScraperServices;

namespace realestate_ia_site.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ScraperController : ControllerBase
    {
        private readonly ILogger<ScraperController> _logger;
        private readonly PropertyImportService _propertyImportService;
        private readonly ScraperStateService _scraperStateService;

        public ScraperController(ILogger<ScraperController> logger, PropertyImportService propertyImportService, ScraperStateService scraperStateService)
        {
            _logger = logger;
            _propertyImportService = propertyImportService;
            _scraperStateService = scraperStateService;
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


        [HttpPut("state/update-current-page")]
        public async Task<IActionResult> UpdateCurrentPage([FromBody] ScraperStateDto request)
        {
            try
            {
                _logger.LogInformation("Received request to update current page - Site: {Site}, Location: {Location}, Page: {Page}",
                    request.Site, request.Location, request.CurrentPage);

                await _scraperStateService.UpdateCurrentPageAsync(request.Site, request.Location, request.CurrentPage);

                _logger.LogInformation("Current page updated successfully");
                return Ok(new { message = "Current page updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating current page");
                return StatusCode(500, new { message = "Internal error updating current page", details = ex.Message });
            }
        }

        [HttpGet("state/current-page")]
        public async Task<IActionResult> GetCurrentPage([FromQuery] string? site = null, [FromQuery] string? location = null)
        {
            try
            {
                _logger.LogInformation("Received request to get current page - Site: {Site}, Location: {Location}", site, location);

                var currentPage = await _scraperStateService.GetCurrentPageAsync(site, location);

                return Ok(new { CurrentPage = currentPage });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current page");
                return StatusCode(500, new { message = "Internal error getting current page", details = ex.Message });
            }
        }

    }
}
