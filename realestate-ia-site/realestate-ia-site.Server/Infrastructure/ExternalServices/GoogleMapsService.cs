using System.Text.Json;
using System.Text.Json.Serialization;

namespace realestate_ia_site.Server.Infrastructure.ExternalServices
{
    public class GoogleMapsService
    {
        private readonly ILogger<GoogleMapsService> _logger;
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public GoogleMapsService(IConfiguration config, ILogger<GoogleMapsService> logger, HttpClient httpClient)
        {
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

            try
            {
                _logger.LogInformation("Chamando Google Maps Geocoding API para: {Location}", locationText);

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
                    _logger.LogInformation("Localização processada com sucesso: Cidade={City}, Concelho={County}, Freguesia={CivilParish}, Estado={State}",
                        parsedLocation.City, parsedLocation.County, parsedLocation.CivilParish, parsedLocation.State);

                    return parsedLocation;
                }
                else
                {
                    _logger.LogWarning("Nenhum resultado obtido da API Google Maps para: {Location}", locationText);
                    return new ParsedLocation { City = string.Empty, State = string.Empty, County = string.Empty, CivilParish = string.Empty };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter localização do Google Maps: {Location}", locationText);

                // Fallback para parsing simples
                var fallbackResult = ParseLocationFallback(locationText);
                return fallbackResult;
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
        public string CivilParish { get; set; } = string.Empty;
    }
}