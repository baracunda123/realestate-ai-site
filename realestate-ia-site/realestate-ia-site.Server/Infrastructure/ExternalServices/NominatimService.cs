using System.Text.Json;
using System.Text.Json.Serialization;
using realestate_ia_site.Server.Application.ExternalServices.Interfaces;
using realestate_ia_site.Server.Application.ExternalServices.Models;

namespace realestate_ia_site.Server.Infrastructure.ExternalServices
{
    /// <summary>
    /// Serviço de geocodificação usando Nominatim (OpenStreetMap)
    /// API gratuita e open-source, sem necessidade de API key
    /// </summary>
    public class NominatimService : IGeocodingService
    {
        private readonly ILogger<NominatimService> _logger;
        private readonly HttpClient _httpClient;
        private const string BaseUrl = "https://nominatim.openstreetmap.org";
        private const string UserAgent = "RealEstateAI-App/1.0 (contact: support@resideai.pt)"; // Nominatim requer User-Agent

        public NominatimService(ILogger<NominatimService> logger, HttpClient httpClient)
        {
            _logger = logger;
            _httpClient = httpClient;
            
            // Nominatim requer User-Agent para identificação
            if (!_httpClient.DefaultRequestHeaders.Contains("User-Agent"))
            {
                _httpClient.DefaultRequestHeaders.Add("User-Agent", UserAgent);
            }
        }

        public async Task<GeocodedLocation> ParseLocationAsync(string locationText, string countryCode = "PT")
        {
            if (string.IsNullOrWhiteSpace(locationText))
            {
                return new GeocodedLocation 
                { 
                    City = string.Empty, 
                    State = string.Empty, 
                    County = string.Empty, 
                    CivilParish = string.Empty 
                };
            }

            try
            {
                _logger.LogInformation("Chamando Nominatim API para: {Location}", locationText);

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
                    var parsedLocation = ExtractLocationComponents(result);
                    _logger.LogInformation(
                        "Localização processada com sucesso via Nominatim: Cidade={City}, Concelho={County}, Freguesia={CivilParish}, Estado={State}",
                        parsedLocation.City, parsedLocation.County, parsedLocation.CivilParish, parsedLocation.State);

                    return parsedLocation;
                }
                else
                {
                    _logger.LogWarning("Nenhum resultado obtido da API Nominatim para: {Location}", locationText);
                    return new GeocodedLocation 
                    { 
                        City = string.Empty, 
                        State = string.Empty, 
                        County = string.Empty, 
                        CivilParish = string.Empty 
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter localização do Nominatim: {Location}", locationText);

                // Fallback para parsing simples
                var fallbackResult = ParseLocationFallback(locationText);
                return fallbackResult;
            }
        }

        private async Task<NominatimResult?> MakeGeocodingRequest(string locationText, string countryCode)
        {
            try
            {
                // Nominatim Search API
                // Documentação: https://nominatim.org/release-docs/latest/api/Search/
                var encodedAddress = Uri.EscapeDataString(locationText);
                var url = $"{BaseUrl}/search?q={encodedAddress}&countrycodes={countryCode.ToLower()}&format=json&addressdetails=1&limit=1&accept-language=pt";

                _logger.LogDebug("Nominatim Request URL: {Url}", url);

                // Nominatim pede para respeitar rate limit de 1 req/sec
                await Task.Delay(1000); // Aguardar 1 segundo entre requests

                var response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var jsonContent = await response.Content.ReadAsStringAsync();
                var results = JsonSerializer.Deserialize<List<NominatimResult>>(jsonContent);

                if (results == null || !results.Any())
                {
                    _logger.LogWarning("Nenhum resultado encontrado para localização: {Location}", locationText);
                    return null;
                }

                return results.First();
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "Erro HTTP ao chamar Nominatim API");
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao fazer request para Nominatim");
                throw;
            }
        }

        private GeocodedLocation ExtractLocationComponents(NominatimResult result)
        {
            string city = string.Empty;
            string state = string.Empty;
            string county = string.Empty;
            string civilParish = string.Empty;

            if (result.Address == null)
            {
                return new GeocodedLocation { City = city, State = state, County = county, CivilParish = civilParish };
            }

            var address = result.Address;

            // Distrito/Estado - em Portugal é "state"
            state = address.State ?? address.Region ?? address.City ?? string.Empty;
            _logger.LogDebug("Estado/Distrito encontrado: {State}", state);

            // Concelho/County - pode estar em "county", "municipality" ou "city"
            county = address.County ?? address.Municipality ?? string.Empty;
            _logger.LogDebug("Concelho/County encontrado: {County}", county);

            // Freguesia - pode estar em "suburb", "neighbourhood" ou "village"
            civilParish = address.Suburb ?? address.Neighbourhood ?? address.Village ?? string.Empty;
            _logger.LogDebug("Freguesia encontrada: {CivilParish}", civilParish);

            // Cidade - pode estar em várias propriedades
            city = address.City ?? address.Town ?? address.Village ?? address.Municipality ?? string.Empty;
            _logger.LogDebug("Cidade encontrada: {City}", city);

            return new GeocodedLocation 
            { 
                City = city, 
                State = state, 
                County = county, 
                CivilParish = civilParish 
            };
        }

        private bool ContainsPointOfInterest(NominatimResult result)
        {
            if (result.Type == null)
                return false;

            // Types que indicam POI no Nominatim
            var poiTypes = new[]
            {
                "attraction",
                "amenity",
                "shop",
                "tourism",
                "historic",
                "building"
            };

            var isPoi = poiTypes.Contains(result.Type.ToLower());
            
            if (isPoi)
            {
                _logger.LogInformation("POI detectado: Tipo={Type}, Nome={Name}", result.Type, result.DisplayName);
            }

            return isPoi;
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

        private GeocodedLocation ParseLocationFallback(string locationText)
        {
            try
            {
                var parts = locationText.Split(',', StringSplitOptions.RemoveEmptyEntries);
                var city = parts.FirstOrDefault()?.Trim() ?? string.Empty;
                var state = parts.Length > 1 ? parts[1].Trim() : "Portugal";
                var county = parts.Length > 2 ? parts[2].Trim() : string.Empty;
                var civilParish = parts.Length > 3 ? parts[3].Trim() : string.Empty;

                _logger.LogDebug("Usando fallback para localização: {City}, {State}, {County}, {CivilParish}", 
                    city, state, county, civilParish);
                
                return new GeocodedLocation 
                { 
                    City = city, 
                    State = state, 
                    County = county, 
                    CivilParish = civilParish 
                };
            }
            catch
            {
                _logger.LogWarning("Erro no fallback de parsing para localização: {Location}", locationText);
                return new GeocodedLocation 
                { 
                    City = string.Empty, 
                    State = "Portugal", 
                    County = string.Empty, 
                    CivilParish = string.Empty 
                };
            }
        }
    }

    // DTOs para deserialização JSON do Nominatim
    public class NominatimResult
    {
        [JsonPropertyName("place_id")]
        public long PlaceId { get; set; }

        [JsonPropertyName("licence")]
        public string? Licence { get; set; }

        [JsonPropertyName("osm_type")]
        public string? OsmType { get; set; }

        [JsonPropertyName("osm_id")]
        public long OsmId { get; set; }

        [JsonPropertyName("lat")]
        public string? Latitude { get; set; }

        [JsonPropertyName("lon")]
        public string? Longitude { get; set; }

        [JsonPropertyName("display_name")]
        public string DisplayName { get; set; } = string.Empty;

        [JsonPropertyName("address")]
        public NominatimAddress? Address { get; set; }

        [JsonPropertyName("type")]
        public string? Type { get; set; }

        [JsonPropertyName("importance")]
        public double? Importance { get; set; }
    }

    public class NominatimAddress
    {
        [JsonPropertyName("house_number")]
        public string? HouseNumber { get; set; }

        [JsonPropertyName("road")]
        public string? Road { get; set; }

        [JsonPropertyName("suburb")]
        public string? Suburb { get; set; }

        [JsonPropertyName("neighbourhood")]
        public string? Neighbourhood { get; set; }

        [JsonPropertyName("village")]
        public string? Village { get; set; }

        [JsonPropertyName("town")]
        public string? Town { get; set; }

        [JsonPropertyName("city")]
        public string? City { get; set; }

        [JsonPropertyName("municipality")]
        public string? Municipality { get; set; }

        [JsonPropertyName("county")]
        public string? County { get; set; }

        [JsonPropertyName("state")]
        public string? State { get; set; }

        [JsonPropertyName("region")]
        public string? Region { get; set; }

        [JsonPropertyName("postcode")]
        public string? Postcode { get; set; }

        [JsonPropertyName("country")]
        public string? Country { get; set; }

        [JsonPropertyName("country_code")]
        public string? CountryCode { get; set; }
    }
}
