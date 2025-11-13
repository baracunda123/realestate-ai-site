using OpenAI.Chat;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using realestate_ia_site.Server.Infrastructure.AI.Prompts;
using realestate_ia_site.Server.Infrastructure.AI.Core;
using System.Text.Json;
using realestate_ia_site.Server.Application.Features.AI.Conversation;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public class PropertyFilterInterpreter : IPropertyFilterInterpreter
    {
        private readonly IOpenAIService _openAIService;
        private readonly ILogger<PropertyFilterInterpreter> _logger;
        private readonly IConversationContextService _contextService;

        public PropertyFilterInterpreter(
            IOpenAIService openAIService,
            ILogger<PropertyFilterInterpreter> logger,
            IConversationContextService contextService)
        {
            _openAIService = openAIService;
            _logger = logger;
            _contextService = contextService;
        }

        public async Task<Dictionary<string, object>> ExtractFiltersAsync(string userQuery, CancellationToken cancellationToken = default)
            => await ExtractFiltersAsync(userQuery, string.Empty, cancellationToken);

        public async Task<Dictionary<string, object>> ExtractFiltersAsync(string userQuery, string sessionId, CancellationToken cancellationToken = default)
            => await ExtractFiltersAsync(userQuery, sessionId, "free", cancellationToken);

        public async Task<Dictionary<string, object>> ExtractFiltersAsync(string userQuery, string sessionId, string userPlan, CancellationToken cancellationToken = default)
        {
            var context = !string.IsNullOrWhiteSpace(sessionId)
                ? await _contextService.GetOrCreateContextAsync(sessionId, cancellationToken)
                : null;

            var messages = PromptBuilder.BuildForFilterExtraction(userQuery, context?.LastFilters);

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 500,
                Temperature = 0.0f,           // MUDADO: 0 para máxima consistência
                TopP = 1.0f,                  // MUDADO: 1.0 para determinismo total
                FrequencyPenalty = 0.0f,
                PresencePenalty = 0.0f
            };

            // Obter modelo baseado no plano do usuário
            var model = _openAIService.GetModelForPlan(userPlan);

            const int maxRetries = 2;
            Dictionary<string, object>? filters = null;

            for (int attempt = 0; attempt <= maxRetries; attempt++)
            {
                try
                {
                    var response = await _openAIService.CompleteChatAsync(messages, options, model, cancellationToken);
                    filters = ParseFiltersFromResponse(response);

                    _logger.LogInformation("Filtros extraídos da IA (tentativa {Attempt}, modelo: {Model}): {@ExtractedFilters}", 
                        attempt + 1, model, filters);

                    // NOVO: Validar se os filtros fazem sentido
                    if (filters.Any() || context?.LastFilters == null || !context.LastFilters.Any())
                    {
                        // Filtros válidos ou primeira query - aceitar
                        break;
                    }
                    else if (attempt < maxRetries)
                    {
                        // Filtros vazios em query de refinamento - tentar novamente
                        _logger.LogWarning("Filtros vazios retornados em tentativa {Attempt}, retry...", attempt + 1);
                        continue;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Erro ao extrair filtros (tentativa {Attempt})", attempt + 1);
                    
                    if (attempt == maxRetries)
                    {
                        // última tentativa falhou - usar contexto ou vazio
                        filters = context?.LastFilters ?? new Dictionary<string, object>();
                        break;
                    }
                }
            }

            if (filters == null)
            {
                filters = new Dictionary<string, object>();
            }

            if (context != null && filters.Any())
            {
                var previousFilters = new Dictionary<string, object>(context.LastFilters);
                
                // Guardar filtros anteriores no histórico antes de fundir
                if (previousFilters.Any())
                {
                    context.FilterHistory.Add(new Dictionary<string, object>(previousFilters));
                    
                    // Limitar histórico a últimas 10 pesquisas
                    if (context.FilterHistory.Count > 10)
                    {
                        context.FilterHistory.RemoveAt(0);
                    }
                }
                
                context.LastFilters = MergeFilters(context.LastFilters, filters, _logger);
                _contextService.UpdateContext(sessionId, context);
                
                _logger.LogInformation("Filtros fundidos - Anterior: {@PreviousFilters}, Novos: {@NewFilters}, Resultado: {@MergedFilters}", 
                    previousFilters, filters, context.LastFilters);
            }

            return context?.LastFilters ?? filters;
        }

        private static Dictionary<string, object> ParseFiltersFromResponse(string response)
        {
            try
            {
                var jsonContent = ExtractFirstJsonObject(response);
                if (string.IsNullOrWhiteSpace(jsonContent))
                    return new Dictionary<string, object>();

                var filters = JsonSerializer.Deserialize<Dictionary<string, object>>(jsonContent);
                if (filters != null)
                {
                    NormalizeFilterValues(filters);
                    return filters;
                }

                return new Dictionary<string, object>();
            }
            catch (JsonException)
            {
                return new Dictionary<string, object>();
            }

            return new Dictionary<string, object>();
        }

        private static string? ExtractFirstJsonObject(string input)
        {
            var start = input.IndexOf('{');
            if (start < 0) return null;

            var depth = 0;
            for (int i = start; i < input.Length; i++)
            {
                if (input[i] == '{') depth++;
                else if (input[i] == '}') depth--;

                if (depth == 0)
                {
                    return input[start..(i + 1)];
                }
            }
            return null;
        }

        private static void NormalizeFilterValues(Dictionary<string, object> filters)
        {
            var keys = filters.Keys.ToList();
            foreach (var key in keys)
            {
                if (filters[key] is JsonElement element)
                {
                    filters[key] = element.ValueKind switch
                    {
                        JsonValueKind.String => element.GetString()!,
                        JsonValueKind.Number => element.TryGetInt64(out var l) ? l : element.GetDouble(),
                        JsonValueKind.True => true,
                        JsonValueKind.False => false,
                        JsonValueKind.Array => element.EnumerateArray().Select(e => e.ToString()).Where(s => s != null).ToList(),
                        _ => element.ToString() ?? string.Empty
                    };
                }
            }
        }

        private static Dictionary<string, object> MergeFilters(Dictionary<string, object> existing, Dictionary<string, object> incoming, ILogger logger)
        {
            var result = new Dictionary<string, object>(existing);
            
            // Detectar filtros conflitantes que devem ser limpos quando novos filtros chegam
            var priceFilterKeys = new[] { "min_price", "max_price", "price", "target_price" };
            var roomsFilterKeys = new[] { "rooms", "min_rooms", "max_rooms" };
            var areaFilterKeys = new[] { "area", "min_area", "max_area", "target_area" };
            
            foreach (var kv in incoming)
            {
                // Se o filtro novo não estiver vazio, adiciona/substitui
                if (!IsEmpty(kv.Value))
                {
                    // ========== FEATURES: Acumular em vez de substituir ==========
                    if (kv.Key == "features" && kv.Value is List<string> newFeatures)
                    {
                        if (result.ContainsKey("features") && result["features"] is List<string> existingFeatures)
                        {
                            // Acumular features únicas
                            var mergedFeatures = existingFeatures.Union(newFeatures).Distinct().ToList();
                            result[kv.Key] = mergedFeatures;
                            logger.LogDebug("Features acumuladas: {Features}", string.Join(", ", mergedFeatures));
                        }
                        else
                        {
                            result[kv.Key] = kv.Value;
                        }
                    }
                    else
                    {
                        result[kv.Key] = kv.Value;
                    }
                    
                    // ========== PREÇO: Gestão de conflitos ==========
                    
                    // Se definir target_price, remover min_price/max_price (são abordagens diferentes)
                    if (kv.Key == "target_price")
                    {
                        if (result.ContainsKey("min_price"))
                        {
                            logger.LogDebug("Removendo min_price - mudou para target_price (busca por proximidade)");
                            result.Remove("min_price");
                        }
                        if (result.ContainsKey("max_price"))
                        {
                            logger.LogDebug("Removendo max_price - mudou para target_price (busca por proximidade)");
                            result.Remove("max_price");
                        }
                    }
                    
                    // Se definir min_price ou max_price, remover target_price (são abordagens diferentes)
                    if (kv.Key is "min_price" or "max_price")
                    {
                        if (result.ContainsKey("target_price"))
                        {
                            logger.LogDebug("Removendo target_price - mudou para limites rígidos (min/max)");
                            result.Remove("target_price");
                        }
                    }
                    
                    // ========== ÁREA: Gestão de conflitos (mesma lógica) ==========
                    
                    // Se definir target_area, remover min_area/max_area (são abordagens diferentes)
                    if (kv.Key == "target_area")
                    {
                        if (result.ContainsKey("min_area"))
                        {
                            logger.LogDebug("Removendo min_area - mudou para target_area (busca por proximidade)");
                            result.Remove("min_area");
                        }
                        if (result.ContainsKey("max_area"))
                        {
                            logger.LogDebug("Removendo max_area - mudou para target_area (busca por proximidade)");
                            result.Remove("max_area");
                        }
                    }
                    
                    // Se definir min_area ou max_area, remover target_area (são abordagens diferentes)
                    if (kv.Key is "min_area" or "max_area")
                    {
                        if (result.ContainsKey("target_area"))
                        {
                            logger.LogDebug("Removendo target_area - mudou para limites rígidos (min/max)");
                            result.Remove("target_area");
                        }
                    }
                    
                    // Se definir min_price, limpar max_price anterior para evitar conflitos (mesma lógica)
                    if (kv.Key == "min_price" && result.ContainsKey("max_price"))
                    {
                        var maxPrice = Convert.ToDecimal(result["max_price"]);
                        var minPrice = Convert.ToDecimal(kv.Value);
                        if (minPrice >= maxPrice)
                        {
                            logger.LogDebug("Removendo max_price conflitante: min_price={MinPrice} >= max_price={MaxPrice}", minPrice, maxPrice);
                            result.Remove("max_price");
                        }
                    }
                    
                    // Se definir max_price, limpar min_price anterior para evitar conflitos (mesma lógica)
                    if (kv.Key == "max_price" && result.ContainsKey("min_price"))
                    {
                        var minPrice = Convert.ToDecimal(result["min_price"]);
                        var maxPrice = Convert.ToDecimal(kv.Value);
                        if (maxPrice <= minPrice)
                        {
                            logger.LogDebug("Removendo min_price conflitante: max_price={MaxPrice} <= min_price={MinPrice}", maxPrice, minPrice);
                            result.Remove("min_price");
                        }
                    }
                    
                    // ========== ROOMS: Detecção de conflitos ==========
                    
                    if (kv.Key == "min_rooms" && result.ContainsKey("max_rooms"))
                    {
                        var maxRooms = Convert.ToInt32(result["max_rooms"]);
                        var minRooms = Convert.ToInt32(kv.Value);
                        if (minRooms >= maxRooms)
                        {
                            logger.LogDebug("Removendo max_rooms conflitante: min_rooms={MinRooms} >= max_rooms={MaxRooms}", minRooms, maxRooms);
                            result.Remove("max_rooms");
                        }
                    }
                    
                    if (kv.Key == "max_rooms" && result.ContainsKey("min_rooms"))
                    {
                        var minRooms = Convert.ToInt32(result["min_rooms"]);
                        var maxRooms = Convert.ToInt32(kv.Value);
                        if (maxRooms <= minRooms)
                        {
                            logger.LogDebug("Removendo min_rooms conflitante: max_rooms={MaxRooms} <= min_rooms={MinRooms}", maxRooms, minRooms);
                            result.Remove("min_rooms");
                        }
                    }
                    
                    // ========== ÁREA: Detecção de conflitos (mesma lógica) ==========
                    
                    if (kv.Key == "min_area" && result.ContainsKey("max_area"))
                    {
                        var maxArea = Convert.ToDecimal(result["max_area"]);
                        var minArea = Convert.ToDecimal(kv.Value);
                        if (minArea >= maxArea)
                        {
                            logger.LogDebug("Removendo max_area conflitante: min_area={MinArea} >= max_area={MaxArea}", minArea, maxArea);
                            result.Remove("max_area");
                        }
                    }
                    
                    if (kv.Key == "max_area" && result.ContainsKey("min_area"))
                    {
                        var minArea = Convert.ToDecimal(result["min_area"]);
                        var maxArea = Convert.ToDecimal(kv.Value);
                        if (maxArea <= minArea)
                        {
                            logger.LogDebug("Removendo min_area conflitante: max_area={MaxArea} <= min_area={MinArea}", maxArea, minArea);
                            result.Remove("min_area");
                        }
                    }
                }
                // Se o novo filtro estiver vazio mas existe na requisição, remover do resultado
                else if (result.ContainsKey(kv.Key))
                {
                    logger.LogDebug("Removendo filtro vazio: {FilterKey}", kv.Key);
                    result.Remove(kv.Key);
                }
            }
            
            return result;
        }

        private static bool IsEmpty(object value)
        {
            return value switch
            {
                null => true,
                string s when string.IsNullOrWhiteSpace(s) => true,
                IEnumerable<object> e => !e.Any(),
                _ => false
            };
        }
    }
}
