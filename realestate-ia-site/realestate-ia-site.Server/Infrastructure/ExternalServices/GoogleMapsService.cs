using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace realestate_ia_site.Server.Infrastructure.ExternalServices
{
    public class GoogleMapsService
    {
        private readonly IMemoryCache _cache;
        private readonly ILogger<GoogleMapsService> _logger;
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public GoogleMapsService(IMemoryCache cache, IConfiguration config, ILogger<GoogleMapsService> logger, HttpClient httpClient)
        {
            _cache = cache;
            _logger = logger;
            _httpClient = httpClient;
            _apiKey = config["GoogleMaps:ApiKey"] ?? throw new InvalidOperationException("Google Maps API key não configurada");
        }

        public async Task<ParsedLocation> ParseLocationAsync(string locationText, string countryCode = "PT")
        {
            if (string.IsNullOrWhiteSpace(locationText))
            {
                return new ParsedLocation { City = string.Empty, State = string.Empty, County = string.Empty, CivilParish = string.Empty };
            }

            var cacheKey = $"location_{locationText}_{countryCode}";
            if (_cache.TryGetValue(cacheKey, out ParsedLocation? cachedResult) && cachedResult != null)
            {
                _logger.LogDebug("Localização encontrada no cache: {Location}", locationText);
                return cachedResult;
            }

            try
            {
                _logger.LogDebug("Fazendo chamada para Google Maps Geocoding API: {Location}", locationText);

                // Primeira tentativa com o endereço original
                var result = await MakeGeocodingRequest(locationText, countryCode);

                // Verificar se o resultado contém POI
                if (result != null && ContainsPointOfInterest(result))
                {
                    _logger.LogInformation("POI detectado em: {Location}. Tentando remover POI e fazer nova chamada.", locationText);

                    // Remover POI e tentar novamente
                    var cleanedLocation = RemovePointOfInterest(locationText);
                    if (!string.IsNullOrEmpty(cleanedLocation) && !cleanedLocation.Equals(locationText, StringComparison.OrdinalIgnoreCase))
                    {
                        _logger.LogInformation("Fazendo segunda chamada sem POI: {CleanedLocation}", cleanedLocation);
                        var cleanResult = await MakeGeocodingRequest(cleanedLocation, countryCode);
                        if (cleanResult != null)
                        {
                            result = cleanResult;
                        }
                    }
                }

                if (result != null)
                {
                    var parsedLocation = ExtractCityStateCountyCivilParish(result);
                    _logger.LogDebug("Localização processada: {City}, {State}, {County}, {CivilParish}",
                        parsedLocation.City, parsedLocation.State, parsedLocation.County, parsedLocation.CivilParish);

                    _cache.Set(cacheKey, parsedLocation, TimeSpan.FromHours(24));
                    return parsedLocation;
                }
                else
                {
                    var emptyResult = new ParsedLocation { City = string.Empty, State = string.Empty, County = string.Empty, CivilParish = string.Empty };
                    _cache.Set(cacheKey, emptyResult, TimeSpan.FromHours(24));
                    return emptyResult;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter localização do Google Maps: {Location}", locationText);

                // Fallback para parsing simples
                var fallbackResult = ParseLocationFallback(locationText);
                _cache.Set(cacheKey, fallbackResult, TimeSpan.FromMinutes(5));
                return fallbackResult;
            }
        }

        /// <summary>
        /// Obter coordenadas geográficas aproximadas para uma propriedade
        /// Usa cache eficiente para evitar chamadas repetidas à API
        /// </summary>
        public async Task<PropertyCoordinates?> GetPropertyCoordinatesAsync(string propertyId, string? address, string? city, string? county, string? state, string countryCode = "PT")
        {
            // Construir endereço completo para geocoding
            var addressParts = new List<string>();
            
            if (!string.IsNullOrWhiteSpace(address)) addressParts.Add(address);
            if (!string.IsNullOrWhiteSpace(city)) addressParts.Add(city);
            if (!string.IsNullOrWhiteSpace(county)) addressParts.Add(county);
            if (!string.IsNullOrWhiteSpace(state)) addressParts.Add(state);
            
            var fullAddress = string.Join(", ", addressParts);
            
            if (string.IsNullOrWhiteSpace(fullAddress))
            {
                _logger.LogWarning("Endereço insuficiente para geocoding da propriedade {PropertyId}", propertyId);
                return null;
            }

            var cacheKey = $"coordinates_{fullAddress}_{countryCode}";
            if (_cache.TryGetValue(cacheKey, out PropertyCoordinates? cachedCoordinates) && cachedCoordinates != null)
            {
                _logger.LogDebug("Coordenadas encontradas no cache para: {Address}", fullAddress);
                return cachedCoordinates;
            }

            try
            {
                _logger.LogDebug("Fazendo geocoding para propriedade {PropertyId}: {Address}", propertyId, fullAddress);

                var result = await MakeGeocodingRequestWithCoordinates(fullAddress, countryCode);

                if (result != null && result.Geometry?.Location != null)
                {
                    var coordinates = new PropertyCoordinates
                    {
                        PropertyId = propertyId,
                        Latitude = (decimal)result.Geometry.Location.Lat,
                        Longitude = (decimal)result.Geometry.Location.Lng,
                        Address = fullAddress,
                        FormattedAddress = result.FormattedAddress,
                        AccuracyLevel = DetermineAccuracyLevel(result)
                    };

                    // Cache por 7 dias - endereços não mudam frequentemente
                    _cache.Set(cacheKey, coordinates, TimeSpan.FromDays(7));
                    
                    _logger.LogInformation("Coordenadas obtidas para {PropertyId}: {Lat}, {Lng} (Precisão: {Accuracy})",
                        propertyId, coordinates.Latitude, coordinates.Longitude, coordinates.AccuracyLevel);

                    return coordinates;
                }
                else
                {
                    _logger.LogWarning("Não foi possível obter coordenadas para {PropertyId}: {Address}", propertyId, fullAddress);
                    
                    // Cache resultado negativo por menos tempo
                    _cache.Set<PropertyCoordinates?>(cacheKey, null, TimeSpan.FromHours(6));
                    return null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter coordenadas para propriedade {PropertyId}: {Address}", propertyId, fullAddress);
                return null;
            }
        }

        private async Task<GeocodeResult?> MakeGeocodingRequest(string locationText, string countryCode)
        {
            var encodedAddress = Uri.EscapeDataString(locationText);
            var url = $"https://maps.googleapis.com/maps/api/geocode/json?address={encodedAddress}&key={_apiKey}&region={countryCode.ToLower()}&language=pt";

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var jsonContent = await response.Content.ReadAsStringAsync();
            var geocodeResponse = JsonSerializer.Deserialize<GeocodeResponse>(jsonContent);

            if (geocodeResponse?.Status != "OK" || geocodeResponse.Results == null || !geocodeResponse.Results.Any())
            {
                _logger.LogWarning("Nenhum resultado encontrado para localização: {Location}. Status: {Status}",
                    locationText, geocodeResponse?.Status);
                return null;
            }

            return geocodeResponse.Results.First();
        }

        private async Task<GeocodeResult?> MakeGeocodingRequestWithCoordinates(string locationText, string countryCode)
        {
            var encodedAddress = Uri.EscapeDataString(locationText);
            var url = $"https://maps.googleapis.com/maps/api/geocode/json?address={encodedAddress}&key={_apiKey}&region={countryCode.ToLower()}&language=pt";

            var response = await _httpClient.GetAsync(url);
            response.EnsureSuccessStatusCode();

            var jsonContent = await response.Content.ReadAsStringAsync();
            var geocodeResponse = JsonSerializer.Deserialize<GeocodeResponseWithGeometry>(jsonContent);

            if (geocodeResponse?.Status != "OK" || geocodeResponse.Results == null || !geocodeResponse.Results.Any())
            {
                _logger.LogWarning("Nenhum resultado encontrado para geocoding: {Location}. Status: {Status}",
                    locationText, geocodeResponse?.Status);
                return null;
            }

            return geocodeResponse.Results.First();
        }

        private string DetermineAccuracyLevel(GeocodeResult result)
        {
            if (result.AddressComponents == null) return "LOW";

            var hasStreetNumber = result.AddressComponents.Any(c => c.Types?.Contains("street_number") == true);
            var hasRoute = result.AddressComponents.Any(c => c.Types?.Contains("route") == true);
            var hasLocality = result.AddressComponents.Any(c => c.Types?.Contains("locality") == true);

            if (hasStreetNumber && hasRoute) return "HIGH";
            if (hasRoute || hasLocality) return "MEDIUM";
            return "LOW";
        }

        private ParsedLocation ExtractCityStateCountyCivilParish(GeocodeResult result)
        {
            string city = string.Empty;
            string state = string.Empty;
            string county = string.Empty;
            string civilParish = string.Empty;

            if (result.AddressComponents == null)
            {
                return new ParsedLocation { City = city, State = state, County = county, CivilParish = civilParish };
            }

            foreach (var component in result.AddressComponents)
            {
                if (component.Types == null) continue;

                // Procurar por distrito/estado - administrative_area_level_1
                if (component.Types.Contains("administrative_area_level_1"))
                {
                    state = component.LongName ?? string.Empty;
                    _logger.LogDebug("Estado/Distrito encontrado: {State}", state);
                }

                // Procurar por concelho/county - administrative_area_level_2
                if (component.Types.Contains("administrative_area_level_2"))
                {
                    county = component.LongName ?? string.Empty;
                    _logger.LogDebug("Concelho/County encontrado: {County}", county);
                }

                // Procurar por freguesia - múltiplas estratégias
                if (component.Types.Contains("administrative_area_level_3"))
                {
                    civilParish = component.LongName ?? string.Empty;
                    _logger.LogDebug("Freguesia (admin_level_3) encontrada: {CivilParish}", civilParish);
                }
                // Procurar por cidade - locality tem prioridade
                if (component.Types.Contains("locality"))
                {
                    city = component.LongName ?? string.Empty;
                    _logger.LogDebug("Cidade (locality) encontrada: {City}", city);
                }
            }

            return new ParsedLocation { City = city, State = state, County = county, CivilParish = civilParish };
        }

        private bool ContainsPointOfInterest(GeocodeResult result)
        {
            if (result.AddressComponents == null)
                return false;

            // Verificar se algum componente é um POI
            foreach (var component in result.AddressComponents)
            {
                if (component.Types == null) continue;

                // Types que indicam POI
                var poiTypes = new[]
                {
                    "point_of_interest",
                    "establishment"
                };

                if (component.Types.Any(type => poiTypes.Contains(type)))
                {
                    _logger.LogInformation("POI detectado: {ComponentName} com tipos: {Types}",
                        component.LongName, string.Join(", ", component.Types));
                    return true;
                }
            }

            return false;
        }

        private string RemovePointOfInterest(string locationText)
        {
            if (string.IsNullOrWhiteSpace(locationText))
                return string.Empty;

            // Encontrar a primeira quebra de linha
            var newlineIndex = locationText.IndexOf('\n');

            if (newlineIndex >= 0)
            {
                // Remover tudo até ao \n (incluindo o \n)
                var result = locationText.Substring(newlineIndex + 1);
                return result.Trim();
            }

            // Se não há \n, retornar o texto original
            return locationText;
        }

        private ParsedLocation ParseLocationFallback(string locationText)
        {
            try
            {
                var parts = locationText.Split(',', StringSplitOptions.RemoveEmptyEntries);
                var city = parts.FirstOrDefault()?.Trim() ?? string.Empty;
                var state = parts.Length > 1 ? parts[1].Trim() : "Portugal";
                var county = parts.Length > 2 ? parts[2].Trim() : string.Empty;
                var civilParish = parts.Length > 3 ? parts[3].Trim() : string.Empty;

                _logger.LogDebug("Usando fallback para localização: {City}, {State}, {County}, {CivilParish}", city, state, county, civilParish);
                return new ParsedLocation { City = city, State = state, County = county, CivilParish = civilParish };
            }
            catch
            {
                _logger.LogWarning("Erro no fallback de parsing para localização: {Location}", locationText);
                return new ParsedLocation { City = string.Empty, State = "Portugal", County = string.Empty, CivilParish = string.Empty };
            }
        }
    }

    // DTOs para deserialização JSON
    public class GeocodeResponse
    {
        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("results")]
        public List<GeocodeResult> Results { get; set; } = new();
    }

    public class GeocodeResponseWithGeometry
    {
        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("results")]
        public List<GeocodeResult> Results { get; set; } = new();
    }

    public class GeocodeResult
    {
        [JsonPropertyName("address_components")]
        public List<AddressComponent> AddressComponents { get; set; } = new();

        [JsonPropertyName("formatted_address")]
        public string FormattedAddress { get; set; } = string.Empty;

        [JsonPropertyName("geometry")]
        public GeocodeGeometry? Geometry { get; set; }
    }

    public class GeocodeGeometry
    {
        [JsonPropertyName("location")]
        public GeocodeLocation? Location { get; set; }

        [JsonPropertyName("location_type")]
        public string LocationType { get; set; } = string.Empty;
    }

    public class GeocodeLocation
    {
        [JsonPropertyName("lat")]
        public double Lat { get; set; }

        [JsonPropertyName("lng")]
        public double Lng { get; set; }
    }

    public class AddressComponent
    {
        [JsonPropertyName("long_name")]
        public string LongName { get; set; } = string.Empty;

        [JsonPropertyName("short_name")]
        public string ShortName { get; set; } = string.Empty;

        [JsonPropertyName("types")]
        public List<string> Types { get; set; } = new();
    }

    public class ParsedLocation
    {
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string County { get; set; } = string.Empty;
        public string CivilParish { get; set; } = string.Empty;
    }

    // Novo DTO para coordenadas de propriedades
    public class PropertyCoordinates
    {
        public string PropertyId { get; set; } = string.Empty;
        public decimal Latitude { get; set; }
        public decimal Longitude { get; set; }
        public string Address { get; set; } = string.Empty;
        public string FormattedAddress { get; set; } = string.Empty;
        public string AccuracyLevel { get; set; } = string.Empty; // HIGH, MEDIUM, LOW
    }
}