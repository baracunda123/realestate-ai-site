using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using realestate_ia_site.Server.Infrastructure.ExternalServices;

namespace realestate_ia_site.Server.Controllers
{
    [ApiController]
    [Route("api/map")]
    [EnableRateLimiting("ApiPolicy")]
    public class MapController : BaseController
    {
        private readonly GoogleMapsService _googleMapsService;
        private readonly ILogger<MapController> _logger;

        public MapController(GoogleMapsService googleMapsService, ILogger<MapController> logger)
        {
            _googleMapsService = googleMapsService;
            _logger = logger;
        }

        /// <summary>
        /// Obter coordenadas para múltiplas propriedades (usado pelo MapView)
        /// </summary>
        [HttpPost("coordinates-batch")]
        [ProducesResponseType(typeof(BatchCoordinatesResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<BatchCoordinatesResponse>> GetBatchCoordinates([FromBody] BatchCoordinatesRequest request)
        {
            if (request?.Properties == null || !request.Properties.Any())
            {
                return BadRequest(new { message = "Lista de propriedades é obrigatória" });
            }

            _logger.LogInformation("Processing coordinates for {Count} properties", request.Properties.Count);

            try
            {
                var coordinates = new List<PropertyCoordinateDto>();
                var tasks = new List<Task<PropertyCoordinateDto?>>();

                // Processar em paralelo para melhor performance
                foreach (var property in request.Properties)
                {
                    tasks.Add(GetSinglePropertyCoordinates(property));
                }

                var results = await Task.WhenAll(tasks);

                // Filtrar apenas resultados válidos
                coordinates.AddRange(results.Where(r => r != null)!);

                _logger.LogInformation("Successfully geocoded {Success}/{Total} properties", 
                    coordinates.Count, request.Properties.Count);

                return Ok(new BatchCoordinatesResponse
                {
                    Coordinates = coordinates
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing batch coordinates");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Obter coordenadas para uma propriedade específica
        /// </summary>
        [HttpPost("coordinates")]
        [ProducesResponseType(typeof(PropertyCoordinateDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<PropertyCoordinateDto>> GetCoordinates([FromBody] SingleCoordinateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.PropertyId))
            {
                return BadRequest(new { message = "PropertyId é obrigatório" });
            }

            try
            {
                var propertyRequest = new PropertyAddressDto
                {
                    PropertyId = request.PropertyId,
                    Address = request.Address,
                    City = request.City,
                    County = request.County,
                    State = request.State
                };

                var result = await GetSinglePropertyCoordinates(propertyRequest);

                if (result == null)
                {
                    return NotFound(new { message = "Não foi possível obter coordenadas para esta propriedade" });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting coordinates for property {PropertyId}", request.PropertyId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        private async Task<PropertyCoordinateDto?> GetSinglePropertyCoordinates(PropertyAddressDto property)
        {
            try
            {
                var coordinates = await _googleMapsService.GetPropertyCoordinatesAsync(
                    property.PropertyId,
                    property.Address,
                    property.City,
                    property.County,
                    property.State
                );

                if (coordinates == null)
                {
                    _logger.LogDebug("No coordinates found for property {PropertyId}", property.PropertyId);
                    return null;
                }

                return new PropertyCoordinateDto
                {
                    PropertyId = coordinates.PropertyId,
                    Latitude = (double)coordinates.Latitude,
                    Longitude = (double)coordinates.Longitude,
                    FormattedAddress = coordinates.FormattedAddress,
                    Accuracy = coordinates.AccuracyLevel
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get coordinates for property {PropertyId}", property.PropertyId);
                return null;
            }
        }
    }

    // DTOs para requests e responses
    public class BatchCoordinatesRequest
    {
        public List<PropertyAddressDto> Properties { get; set; } = new();
    }

    public class SingleCoordinateRequest
    {
        public string PropertyId { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? County { get; set; }
        public string? State { get; set; }
    }

    public class PropertyAddressDto
    {
        public string PropertyId { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? County { get; set; }
        public string? State { get; set; }
    }

    public class PropertyCoordinateDto
    {
        public string PropertyId { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string FormattedAddress { get; set; } = string.Empty;
        public string Accuracy { get; set; } = string.Empty;
    }

    public class BatchCoordinatesResponse
    {
        public List<PropertyCoordinateDto> Coordinates { get; set; } = new();
    }
}