using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using realestate_ia_site.Server.Application.ExternalServices.Interfaces;
using realestate_ia_site.Server.Application.ExternalServices.Models;
using System.Security.Cryptography;
using System.Text;

namespace realestate_ia_site.Server.Infrastructure.ExternalServices
{
    /// <summary>
    /// Serviço de geocodificação usando Mapbox Geocoding API v6
    /// API robusta e escalável para geocoding em produção
    /// </summary>
    public class MapboxGeocodingService : IGeocodingService
    {
        private readonly ILogger<MapboxGeocodingService> _logger;
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        private readonly string _apiKey;
        private const string BaseUrl = "https://api.mapbox.com/search/geocode/v6/forward";
        private const int RateLimitDelayMs = 100; // Mapbox permite ate 600 req/min (1000ms/600 ? 100ms)
        
        // VERSÃO DA LÓGICA DE EXTRAÇÃO: Incrementar quando alterar ExtractLocationComponents
        // Isso invalida automaticamente o cache antigo sem precisar limpar manualmente
        private const string EXTRACTION_LOGIC_VERSION = "v2";
        
        private DateTime _lastRequestTime = DateTime.MinValue;
        private readonly SemaphoreSlim _rateLimitSemaphore = new SemaphoreSlim(1, 1);

        public MapboxGeocodingService(
            ILogger<MapboxGeocodingService> logger, 
            HttpClient httpClient, 
            IMemoryCache cache,
            IConfiguration configuration)
        {
            _logger = logger;
            _httpClient = httpClient;
            _cache = cache;
            
            // Obter API key da configuração
            _apiKey = configuration["Mapbox:ApiKey"] 
                      ?? throw new InvalidOperationException("Mapbox API key não configurada em appsettings.json");
            
            _logger.LogInformation("MapboxGeocodingService (v6) inicializado com versão de extração: {Version}", EXTRACTION_LOGIC_VERSION);
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

            // DEBUG: Log do endereço original
            _logger.LogDebug("ParseLocationAsync chamado com: {Location}", locationText);

            // CACHE: Verificar cache ANTES de processar
            var cacheKey = GenerateCacheKey(locationText, countryCode);
            
            if (_cache.TryGetValue<GeocodedLocation>(cacheKey, out var cachedLocation))
            {
                _logger.LogInformation("Cache HIT (v{Version}) para: {Location}", EXTRACTION_LOGIC_VERSION, locationText);
                _logger.LogDebug("Retornando do cache: City={City}, County={County}", cachedLocation!.City, cachedLocation.County);
                return cachedLocation!;
            }

            // Cache MISS - buscar da API e processar
            _logger.LogInformation("Cache MISS - Chamando Mapbox API v6 para: {Location}", locationText);
            
            MapboxFeature? result = null;
            
            try
            {
                // Tentativa com o endereço original
                result = await MakeGeocodingRequest(locationText, countryCode);

                // Se não encontrou resultado, tentar simplificação progressiva
                if (result == null)
                {
                    _logger.LogWarning("Nenhum resultado obtido. Tentando simplificação progressiva do endereço.");
                    result = await TryProgressiveSimplification(locationText, countryCode);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter localização do Mapbox v6: {Location}", locationText);

                // Fallback para parsing simples
                var fallbackResult = ParseLocationFallback(locationText);
                return fallbackResult;
            }

            // Processar resultado e cachear
            GeocodedLocation parsedLocation;
            
            if (result != null)
            {
                //DEBUG: Log da resposta RAW da API antes da extração
                _logger.LogDebug("Raw API response - Name: {Name}, FeatureType: {Type}, Locality: {Locality}, Place: {Place}", 
                    result.Properties?.Name ?? "NULL",
                    result.Properties?.FeatureType ?? "NULL",
                    result.Properties?.Context?.Locality?.Name ?? "NULL",
                    result.Properties?.Context?.Place?.Name ?? "NULL");
                
                parsedLocation = ExtractLocationComponents(result);
                
                _logger.LogInformation(
                    "Localização processada via Mapbox v6: Cidade={City}, Concelho={County}, Freguesia={CivilParish}, Estado={State}",
                    parsedLocation.City, parsedLocation.County, parsedLocation.CivilParish, parsedLocation.State);
                
                // CACHE: Guardar resultado FINAL por 24 horas
                _cache.Set(cacheKey, parsedLocation, TimeSpan.FromHours(24));
                _logger.LogDebug("Resultado cacheado");
            }
            else
            {
                _logger.LogWarning("Nenhum resultado obtido da API Mapbox após todas as tentativas para: {Location}", locationText);
                
                // Usar fallback local apenas como último recurso
                parsedLocation = ParseLocationFallback(locationText);
            }
            
            return parsedLocation;
        }

        /// <summary>
        /// Gera uma chave de cache única usando hash SHA256 com versionamento
        /// Case-insensitive mas preserva acentos e pontuação
        /// </summary>
        private static string GenerateCacheKey(string locationText, string countryCode)
        {
            // Normalizar: remover espaços extras e converter para lowercase (case-insensitive)
            var normalized = string.Join(" ", locationText.Split(new[] { ' ', '\t', '\n', '\r' }, 
                StringSplitOptions.RemoveEmptyEntries)).ToLowerInvariant();
            
            // Incluir versão da lógica de extração na chave
            var input = $"{normalized}|{countryCode.ToUpperInvariant()}|{EXTRACTION_LOGIC_VERSION}";
            var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
            var hash = Convert.ToHexString(hashBytes);
            
            return $"mapbox_{EXTRACTION_LOGIC_VERSION}_{hash}";
        }

        /// <summary>
        /// Tenta simplificar progressivamente o endereço removendo partes da esquerda para direita
        /// </summary>
        private async Task<MapboxFeature?> TryProgressiveSimplification(string locationText, string countryCode)
        {
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
                var simplifiedQuery = string.Join(", ", parts.Skip(i));
                
                _logger.LogDebug("Tentativa {Attempt}/{Total}: Simplificando para '{Query}'", 
                    i, parts.Length - 1, simplifiedQuery);

                try
                {
                    var result = await MakeGeocodingRequest(simplifiedQuery, countryCode);
                    
                    if (result != null)
                    {
                        _logger.LogInformation("Sucesso com simplificação (tentativa {Attempt}): '{Query}'", 
                            i, simplifiedQuery);
                        return result;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Erro na tentativa {Attempt} de simplificação: {Query}", i, simplifiedQuery);
                }
            }

            _logger.LogWarning("Nenhuma simplificação teve sucesso após {Count} tentativas", parts.Length - 1);
            return null;
        }

        private async Task<MapboxFeature?> MakeGeocodingRequest(string locationText, string countryCode)
        {
            try
            {
                // RATE LIMITING
                await _rateLimitSemaphore.WaitAsync();
                try
                {
                    var timeSinceLastRequest = DateTime.UtcNow - _lastRequestTime;
                    var remainingDelay = RateLimitDelayMs - (int)timeSinceLastRequest.TotalMilliseconds;
                    
                    if (remainingDelay > 0)
                    {
                        await Task.Delay(remainingDelay);
                    }
                    
                    _lastRequestTime = DateTime.UtcNow;
                }
                finally
                {
                    _rateLimitSemaphore.Release();
                }

                // Mapbox Geocoding API v6 - Forward Geocoding
                // Documentação: https://docs.mapbox.com/api/search/geocoding/
                var encodedQuery = Uri.EscapeDataString(locationText);
                var url = $"{BaseUrl}?q={encodedQuery}&country={countryCode.ToLower()}&limit=1&language=pt&access_token={_apiKey}";

                _logger.LogDebug("Mapbox v6 Request URL: {Url}", url.Replace(_apiKey, "***"));

                var response = await _httpClient.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var jsonContent = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<MapboxResponse>(jsonContent);

                if (result?.Features == null || !result.Features.Any())
                {
                    _logger.LogWarning("Nenhum resultado encontrado para localização: {Location}", locationText);
                    return null;
                }

                return result.Features.First();
            }
            catch (HttpRequestException httpEx)
            {
                _logger.LogError(httpEx, "Erro HTTP ao chamar Mapbox API v6");
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao fazer request para Mapbox v6");
                throw;
            }
        }

        private GeocodedLocation ExtractLocationComponents(MapboxFeature feature)
        {
            string city = string.Empty;
            string state = string.Empty;
            string county = string.Empty;
            string civilParish = string.Empty;

            if (feature.Properties?.Context == null)
            {
                // Se não há contexto, usar o name ou place_formatted principal
                var fallbackText = feature.Properties?.PlaceFormatted 
                                   ?? feature.Properties?.Name 
                                   ?? string.Empty;
                
                _logger.LogDebug("Sem contexto no resultado, usando place_formatted/name: {Text}", fallbackText);
                return ParseLocationFallback(fallbackText);
            }

            var context = feature.Properties.Context;

            // MAPEAMENTO MAPBOX v6 PARA PORTUGAL
            // Baseado na documentação oficial e estrutura administrativa portuguesa
            // region = Distrito | place = Concelho | locality = Localidade | neighborhood = Freguesia

            // 1. DISTRITO (State) - region
            if (context.Region != null)
            {
                state = context.Region.Name ?? string.Empty;
                _logger.LogDebug("Distrito (region) encontrado: {State}", state);
            }

            // 2. CONCELHO (County) - place
            if (context.Place != null)
            {
                county = context.Place.Name ?? string.Empty;
                _logger.LogDebug("Concelho (place) encontrado: {County}", county);
            }

            // 3. LOCALIDADE (City) - locality (se diferente do concelho)
            if (context.Locality != null && !string.IsNullOrEmpty(context.Locality.Name))
            {
                var localityName = context.Locality.Name;
                // Só usar locality como city se for DIFERENTE do concelho
                if (!localityName.Equals(county, StringComparison.OrdinalIgnoreCase))
                {
                    city = localityName;
                    _logger.LogDebug("Localidade (locality) encontrada: {City}", city);
                }
            }

            // 4. FREGUESIA (CivilParish) - neighborhood
            if (context.Neighborhood != null)
            {
                civilParish = context.Neighborhood.Name ?? string.Empty;
                _logger.LogDebug("Freguesia (neighborhood) encontrada: {CivilParish}", civilParish);
            }

            // Fallback: Se ainda não temos city, usar o name do feature (se for place/locality)
            if (string.IsNullOrEmpty(city) && !string.IsNullOrEmpty(feature.Properties?.Name))
            {
                var featureType = feature.Properties.FeatureType;
                if (featureType == "place" || featureType == "locality")
                {
                    var featureName = feature.Properties.Name;
                    // Só usar se diferente do county
                    if (!featureName.Equals(county, StringComparison.OrdinalIgnoreCase))
                    {
                        city = featureName;
                        _logger.LogDebug("Cidade extraída do feature name: {City}", city);
                    }
                }
            }

            // VALIDACAO 1: Se State vazio, derivar do County
            if (string.IsNullOrWhiteSpace(state) && !string.IsNullOrWhiteSpace(county))
            {
                state = county;
                _logger.LogDebug("Distrito derivado do concelho: {State}", state);
            }

            // VALIDACAO 2: Se City == County, limpar City
            if (!string.IsNullOrWhiteSpace(city) && !string.IsNullOrWhiteSpace(county))
            {
                if (city.Equals(county, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogDebug("City igual a County - limpando City");
                    city = string.Empty;
                }
            }

            // VALIDACAO 3: Se CivilParish duplicado, limpar
            if (!string.IsNullOrWhiteSpace(civilParish))
            {
                if ((!string.IsNullOrWhiteSpace(city) && civilParish.Equals(city, StringComparison.OrdinalIgnoreCase)) ||
                    (!string.IsNullOrWhiteSpace(county) && civilParish.Equals(county, StringComparison.OrdinalIgnoreCase)))
                {
                    _logger.LogDebug("Freguesia duplicada - limpando");
                    civilParish = string.Empty;
                }
            }

            _logger.LogDebug("RESULTADO FINAL - State: {State}, County: {County}, City: {City}, Parish: {Parish}",
                state, county, city, civilParish);

            return new GeocodedLocation 
            { 
                City = city, 
                State = state, 
                County = county, 
                CivilParish = civilParish 
            };
        }

        /// <summary>
        /// Fallback LOCAL simplificado - apenas para casos extremos onde Mapbox falha completamente
        /// Confia na API Mapbox v6 para a maioria dos casos
        /// </summary>
        private GeocodedLocation ParseLocationFallback(string locationText)
        {
            try
            {
                _logger.LogWarning("Usando fallback LOCAL (API Mapbox falhou): {Location}", locationText);

                // Limpar espaços extras
                var cleanedText = System.Text.RegularExpressions.Regex.Replace(locationText, @"\s+", " ").Trim();
                
                // Separar por vírgula ou quebra de linha
                var parts = cleanedText.Split(new[] { ',', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                    .Select(p => p.Trim())
                    .Where(p => !string.IsNullOrWhiteSpace(p))
                    .ToArray();

                if (parts.Length == 0)
                {
                    _logger.LogError("Fallback: nenhuma parte válida encontrada");
                    return new GeocodedLocation 
                    { 
                        City = string.Empty, 
                        State = "Portugal", 
                        County = string.Empty, 
                        CivilParish = string.Empty 
                    };
                }

                // Estratégia simples: última parte = distrito, penúltima = concelho
                string state = parts[^1]; // Último elemento
                string county = parts.Length > 1 ? parts[^2] : parts[^1];
                string city = string.Empty;
                string civilParish = string.Empty;

                _logger.LogInformation("Fallback: State={State}, County={County}", state, county);

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
                _logger.LogError(ex, "Erro crítico no fallback LOCAL: {Location}", locationText);
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

    // ========================================
    // DTOs para Mapbox Geocoding API v6
    // ========================================

    public class MapboxResponse
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("features")]
        public List<MapboxFeature> Features { get; set; } = new();

        [JsonPropertyName("attribution")]
        public string? Attribution { get; set; }
    }

    public class MapboxFeature
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("geometry")]
        public MapboxGeometry? Geometry { get; set; }

        [JsonPropertyName("properties")]
        public MapboxProperties? Properties { get; set; }
    }

    public class MapboxGeometry
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("coordinates")]
        public List<double>? Coordinates { get; set; }
    }

    public class MapboxProperties
    {
        [JsonPropertyName("mapbox_id")]
        public string? MapboxId { get; set; }

        [JsonPropertyName("feature_type")]
        public string FeatureType { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("name_preferred")]
        public string? NamePreferred { get; set; }

        [JsonPropertyName("place_formatted")]
        public string? PlaceFormatted { get; set; }

        [JsonPropertyName("full_address")]
        public string? FullAddress { get; set; }

        [JsonPropertyName("context")]
        public MapboxContext? Context { get; set; }

        [JsonPropertyName("coordinates")]
        public MapboxCoordinates? Coordinates { get; set; }

        [JsonPropertyName("bbox")]
        public List<double>? Bbox { get; set; }

        [JsonPropertyName("match_code")]
        public MapboxMatchCode? MatchCode { get; set; }
    }

    public class MapboxContext
    {
        [JsonPropertyName("country")]
        public MapboxContextItem? Country { get; set; }

        [JsonPropertyName("region")]
        public MapboxContextItem? Region { get; set; }

        [JsonPropertyName("postcode")]
        public MapboxContextItem? Postcode { get; set; }

        [JsonPropertyName("place")]
        public MapboxContextItem? Place { get; set; }

        [JsonPropertyName("locality")]
        public MapboxContextItem? Locality { get; set; }

        [JsonPropertyName("neighborhood")]
        public MapboxContextItem? Neighborhood { get; set; }

        [JsonPropertyName("street")]
        public MapboxContextItem? Street { get; set; }
    }

    public class MapboxContextItem
    {
        [JsonPropertyName("mapbox_id")]
        public string? MapboxId { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("wikidata_id")]
        public string? WikidataId { get; set; }

        [JsonPropertyName("country_code")]
        public string? CountryCode { get; set; }

        [JsonPropertyName("country_code_alpha_3")]
        public string? CountryCodeAlpha3 { get; set; }

        [JsonPropertyName("region_code")]
        public string? RegionCode { get; set; }

        [JsonPropertyName("region_code_full")]
        public string? RegionCodeFull { get; set; }

        [JsonPropertyName("translations")]
        public Dictionary<string, MapboxTranslation>? Translations { get; set; }
    }

    public class MapboxTranslation
    {
        [JsonPropertyName("language")]
        public string? Language { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }
    }

    public class MapboxCoordinates
    {
        [JsonPropertyName("longitude")]
        public double Longitude { get; set; }

        [JsonPropertyName("latitude")]
        public double Latitude { get; set; }

        [JsonPropertyName("accuracy")]
        public string? Accuracy { get; set; }

        [JsonPropertyName("routable_points")]
        public List<MapboxRoutablePoint>? RoutablePoints { get; set; }
    }

    public class MapboxRoutablePoint
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("longitude")]
        public double Longitude { get; set; }

        [JsonPropertyName("latitude")]
        public double Latitude { get; set; }
    }

    public class MapboxMatchCode
    {
        [JsonPropertyName("matched")]
        public bool Matched { get; set; }
    }
}
