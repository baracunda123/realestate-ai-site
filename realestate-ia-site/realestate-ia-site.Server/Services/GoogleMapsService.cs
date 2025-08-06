using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace realestate_ia_site.Server.Services
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
                return new ParsedLocation { City = string.Empty, State = string.Empty, County = string.Empty };
            }

            var cacheKey = $"{locationText}_{countryCode}";
            if (_cache.TryGetValue(cacheKey, out ParsedLocation? cachedResult) && cachedResult != null)
            {
                _logger.LogDebug("Localização encontrada no cache: {Location}", locationText);
                return cachedResult;
            }

            try
            {
                _logger.LogDebug("Fazendo chamada para Google Maps Geocoding API: {Location}", locationText);

                // Construir URL da API
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
                    var emptyResult = new ParsedLocation { City = string.Empty, State = string.Empty, County = string.Empty };
                    _cache.Set(cacheKey, emptyResult, TimeSpan.FromHours(24));
                    return emptyResult;
                }

                var result = geocodeResponse.Results.First();
                var parsedLocation = ExtractCityStateCounty(result);

                _logger.LogDebug("Localização processada: {City}, {State}, {County}", parsedLocation.City, parsedLocation.State, parsedLocation.County);

                _cache.Set(cacheKey, parsedLocation, TimeSpan.FromHours(24));
                return parsedLocation;
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

        private ParsedLocation ExtractCityStateCounty(GeocodeResult result)
        {
            string city = string.Empty;
            string state = string.Empty;
            string county = string.Empty;

            if (result.AddressComponents == null)
            {
                return new ParsedLocation { City = city, State = state, County = county };
            }

            foreach (var component in result.AddressComponents)
            {
                if (component.Types == null) continue;

                // Procurar por cidade - usar string comparison em vez de includes
                if (component.Types.Any(type => type == "locality" || type == "administrative_area_level_2"))
                {
                    city = component.LongName ?? string.Empty;
                }

                // Procurar por estado/distrito - usar string comparison em vez de includes
                if (component.Types.Any(type => type == "administrative_area_level_1"))
                {
                    state = component.LongName ?? string.Empty;
                }

                // Procurar por concelho/county - usar string comparison
                if (component.Types.Any(type => type == "administrative_area_level_2" || type == "sublocality"))
                {
                    // Se ainda não temos cidade, este pode ser o concelho
                    if (string.IsNullOrEmpty(city) || component.Types.Any(type => type == "administrative_area_level_2"))
                    {
                        county = component.LongName ?? string.Empty;
                    }
                }
            }

            return new ParsedLocation { City = city, State = state, County = county };
        }

        private ParsedLocation ParseLocationFallback(string locationText)
        {
            try
            {
                var parts = locationText.Split(',', StringSplitOptions.RemoveEmptyEntries);
                var city = parts.FirstOrDefault()?.Trim() ?? string.Empty;
                var state = parts.Length > 1 ? parts[1].Trim() : "Portugal";
                var county = parts.Length > 2 ? parts[2].Trim() : string.Empty;

                _logger.LogDebug("Usando fallback para localização: {City}, {State}, {County}", city, state, county);
                return new ParsedLocation { City = city, State = state, County = county };
            }
            catch
            {
                _logger.LogWarning("Erro no fallback de parsing para localização: {Location}", locationText);
                return new ParsedLocation { City = string.Empty, State = "Portugal", County = string.Empty };
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

    public class GeocodeResult
    {
        [JsonPropertyName("address_components")]
        public List<AddressComponent> AddressComponents { get; set; } = new();

        [JsonPropertyName("formatted_address")]
        public string FormattedAddress { get; set; } = string.Empty;
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

    }
}