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

                // Se não encontrou resultado, tentar simplificar progressivamente
                if (result == null)
                {
                    _logger.LogWarning("Nenhum resultado obtido. Tentando simplificação progressiva do endereço.");
                    result = await TryProgressiveSimplification(locationText, countryCode);
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
                    _logger.LogWarning("Nenhum resultado obtido da API Nominatim após todas as tentativas para: {Location}", locationText);
                    
                    // Usar fallback local apenas como último recurso
                    return ParseLocationFallback(locationText);
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

        /// <summary>
        /// Tenta simplificar progressivamente o endereço removendo partes da esquerda para direita
        /// Estratégia: "Rua X, Freguesia Y, Cidade Z" -> "Freguesia Y, Cidade Z" -> "Cidade Z"
        /// </summary>
        private async Task<NominatimResult?> TryProgressiveSimplification(string locationText, string countryCode)
        {
            // Separar por vírgula ou quebra de linha
            var separators = new[] { ',', '\n' };
            var parts = locationText.Split(separators, StringSplitOptions.RemoveEmptyEntries)
                .Select(p => p.Trim())
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .ToArray();

            if (parts.Length <= 1)
            {
                _logger.LogDebug("Simplificação progressiva não aplicável: apenas 1 parte no endereço");
                return null;
            }

            // Tentar removendo a primeira parte progressivamente
            for (int i = 1; i < parts.Length; i++)
            {
                // Criar query sem as primeiras 'i' partes
                var simplifiedQuery = string.Join(", ", parts.Skip(i));
                
                _logger.LogDebug("Tentativa {Attempt}/{Total}: Simplificando para '{Query}'", 
                    i, parts.Length - 1, simplifiedQuery);

                try
                {
                    var result = await MakeGeocodingRequest(simplifiedQuery, countryCode);
                    
                    if (result != null)
                    {
                        _logger.LogInformation("? Sucesso com simplificação progressiva (tentativa {Attempt}): '{Query}'", 
                            i, simplifiedQuery);
                        return result;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Erro na tentativa {Attempt} de simplificação: {Query}", i, simplifiedQuery);
                    // Continuar para próxima tentativa
                }
            }

            _logger.LogWarning("Nenhuma simplificação progressiva teve sucesso após {Count} tentativas", parts.Length - 1);
            return null;
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

            // ???? MAPEAMENTO ESPECÍFICO PARA PORTUGAL

            // 1. CONCELHO (County) - prioritário
            county = address.County ?? address.Municipality ?? string.Empty;
            _logger.LogDebug("Concelho/County encontrado: {County}", county);

            // 2. DISTRITO/ESTADO (State)
            // Em Portugal, county muitas vezes É o distrito (ex: Leiria)
            // Prioridade: state > region > county > city
            state = address.State ?? address.Region ?? address.County ?? address.City ?? string.Empty;
            _logger.LogDebug("Estado/Distrito encontrado: {State}", state);

            // 3. CIDADE (City)
            // Prioridade: city > town > village > municipality > hamlet
            city = address.City ?? address.Town ?? address.Village ?? address.Municipality ?? address.Hamlet ?? string.Empty;
            _logger.LogDebug("Cidade encontrada: {City}", city);

            // 4. FREGUESIA (CivilParish)
            // Prioridade: city_district (freguesia unificada) > suburb > neighbourhood > village > hamlet
            civilParish = address.CityDistrict ?? address.Suburb ?? address.Neighbourhood ?? address.Village ?? address.Hamlet ?? string.Empty;
            _logger.LogDebug("Freguesia encontrada: {CivilParish}", civilParish);

            // ? VALIDAÇÃO: Se State está vazio mas County tem valor, usar County como State
            // (Em Portugal, muitos concelhos são também distritos com o mesmo nome)
            if (string.IsNullOrWhiteSpace(state) && !string.IsNullOrWhiteSpace(county))
            {
                state = county;
                _logger.LogDebug("Estado/Distrito derivado do concelho: {State}", state);
            }

            // ? VALIDAÇÃO: Se City está vazio mas Town tem valor, usar Town
            if (string.IsNullOrWhiteSpace(city) && !string.IsNullOrWhiteSpace(address.Town))
            {
                city = address.Town;
                _logger.LogDebug("Cidade derivada de Town: {City}", city);
            }

            // ? VALIDAÇÃO DE SEGURANÇA: Garantir que Road NUNCA seja usado como City/State
            if (!string.IsNullOrWhiteSpace(city) && !string.IsNullOrWhiteSpace(address.Road))
            {
                if (city.Equals(address.Road, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("?? BUG DETECTADO: City tinha valor de Road! Corrigindo...");
                    city = address.Town ?? address.Municipality ?? county ?? string.Empty;
                    _logger.LogInformation("? City corrigido: {City}", city);
                }
            }

            if (!string.IsNullOrWhiteSpace(state) && !string.IsNullOrWhiteSpace(address.Road))
            {
                if (state.Equals(address.Road, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("?? BUG DETECTADO: State tinha valor de Road! Corrigindo...");
                    state = county ?? string.Empty;
                    _logger.LogInformation("? State corrigido: {State}", state);
                }
            }

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
                _logger.LogInformation("?? Usando fallback LOCAL para parsing de localização: {Location}", locationText);

                // Remover quebras de linha e espaços extras
                var cleanedText = System.Text.RegularExpressions.Regex.Replace(locationText, @"\s+", " ").Trim();

                // Separar por vírgulas ou quebras de linha
                var separators = new[] { ',', '\n' };
                var parts = cleanedText.Split(separators, StringSplitOptions.RemoveEmptyEntries)
                    .Select(p => p.Trim())
                    .Where(p => !string.IsNullOrWhiteSpace(p))
                    .ToArray();

                if (parts.Length == 0)
                {
                    _logger.LogWarning("?? Fallback: nenhuma parte válida encontrada");
                    return new GeocodedLocation 
                    { 
                        City = string.Empty, 
                        State = "Portugal", 
                        County = string.Empty, 
                        CivilParish = string.Empty 
                    };
                }

                // ESTRATÉGIA GENÉRICA: 
                // - Último termo geralmente é o mais abrangente (Distrito/Cidade)
                // - Penúltimo pode ser Cidade/Concelho
                // - Antepenúltimo pode ser Freguesia
                // - Primeiro termo geralmente é mais específico (Rua, POI)
                
                string city = string.Empty;
                string state = string.Empty;
                string county = string.Empty;
                string civilParish = string.Empty;

                // Extrair do fim para o início (termos mais abrangentes)
                if (parts.Length >= 1)
                {
                    // Último termo: geralmente distrito ou cidade principal
                    var lastTerm = parts[^1];
                    state = lastTerm;
                    county = lastTerm;  // Em Portugal, distrito = concelho frequentemente
                    city = lastTerm;    // Usar como fallback também
                }

                if (parts.Length >= 2)
                {
                    // Penúltimo termo: pode ser cidade ou concelho diferente
                    var secondLastTerm = parts[^2];
                    
                    // Se o penúltimo não parece ser uma rua, usar como cidade
                    if (!IsRoadPattern(secondLastTerm))
                    {
                        city = secondLastTerm;
                    }
                }

                if (parts.Length >= 3)
                {
                    // Antepenúltimo: pode ser freguesia
                    var thirdLastTerm = parts[^3];
                    
                    if (!IsRoadPattern(thirdLastTerm))
                    {
                        civilParish = thirdLastTerm;
                    }
                }

                // Se City ficou com padrão de rua, tentar corrigir
                if (IsRoadPattern(city) && parts.Length >= 2)
                {
                    _logger.LogWarning("?? City parece ser uma rua: '{City}'. Usando termo seguinte.", city);
                    city = parts[^1];  // Usar último termo
                }

                _logger.LogInformation("? Fallback LOCAL concluído: Cidade={City}, Estado={State}, Concelho={County}, Freguesia={CivilParish}",
                    city, state, county, civilParish);

                return new GeocodedLocation 
                { 
                    City = city, 
                    State = state, 
                    County = county, 
                    CivilParish = civilParish 
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "? Erro crítico no fallback LOCAL de parsing para localização: {Location}", locationText);
                return new GeocodedLocation 
                { 
                    City = string.Empty, 
                    State = "Portugal", 
                    County = string.Empty, 
                    CivilParish = string.Empty 
                };
            }
        }

        /// <summary>
        /// Verifica se um termo parece ser um padrão de rua/estrada
        /// </summary>
        private bool IsRoadPattern(string term)
        {
            if (string.IsNullOrWhiteSpace(term))
                return false;

            var roadPatterns = new[] 
            { 
                "Rua ", "Avenida ", "Estrada ", "Travessa ", "Largo ", "Praça ",
                "R. ", "Av. ", "Trav. ", "Pç. "
            };

            return roadPatterns.Any(pattern => term.StartsWith(pattern, StringComparison.OrdinalIgnoreCase));
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

        [JsonPropertyName("hamlet")]
        public string? Hamlet { get; set; }

        [JsonPropertyName("city_district")]
        public string? CityDistrict { get; set; }
    }
}
