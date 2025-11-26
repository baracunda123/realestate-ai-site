using OpenAI.Chat;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using realestate_ia_site.Server.Application.Common.Context;
using realestate_ia_site.Server.Infrastructure.AI.Prompts;
using realestate_ia_site.Server.Infrastructure.AI.Core;
using System.Text.Json;
using realestate_ia_site.Server.Application.Features.AI.Conversation;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public class PropertyFilterInterpreter : IPropertyFilterInterpreter
    {
        private readonly IOpenAIService _openAIService;
        private readonly UserRequestContext _userContext;
        private readonly ILogger<PropertyFilterInterpreter> _logger;
        private readonly IConversationContextService _contextService;

        public PropertyFilterInterpreter(
            IOpenAIService openAIService,
            UserRequestContext userContext,
            ILogger<PropertyFilterInterpreter> logger,
            IConversationContextService contextService)
        {
            _openAIService = openAIService;
            _userContext = userContext;
            _logger = logger;
            _contextService = contextService;
        }

        /// <summary>
        /// Extrai filtros da query do utilizador usando contexto de conversa
        /// </summary>
        public async Task<Dictionary<string, object>> ExtractFiltersAsync(
            string userQuery, 
            ConversationContext? context, 
            UserIntentAnalysis? userIntent, 
            CancellationToken cancellationToken = default)
        {
            var messages = PromptBuilder.BuildForFilterExtraction(userQuery, context?.LastFilters, userIntent);

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 500,
                Temperature = 0.0f,
                TopP = 1.0f,
                FrequencyPenalty = 0.0f,
                PresencePenalty = 0.0f
            };

            var model = _userContext.IsPremium ? "gpt-4o" : "gpt-4o-mini";
            var isProModel = _userContext.IsPremium;

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

            // Enriquecer features abstratas APENAS se for modelo mini (GPT-4o já faz isso nativamente)
            // GPT-4o-mini precisa de ajuda para expandir termos abstratos
            // GPT-4o é inteligente o suficiente para fazer expansão contextual sozinho
            if (!isProModel && filters.ContainsKey("features"))
            {
                EnrichAbstractFeatures(filters);
                _logger.LogInformation("[Features] Expansão determinística aplicada (modelo mini)");
            }
            else if (isProModel && filters.ContainsKey("features"))
            {
                _logger.LogInformation("[Features] Usando expansão nativa do GPT-4o (sem override)");
            }

            // Fazer merge com filtros anteriores se existirem
            if (context != null && context.LastFilters.Any())
            {
                var mergedFilters = MergeFilters(context.LastFilters, filters, _logger);
                _logger.LogInformation("Filtros fundidos - Anterior: {@PreviousFilters}, Novos: {@NewFilters}, Resultado: {@MergedFilters}", 
                    context.LastFilters, filters, mergedFilters);
                return mergedFilters;
            }

            return filters;
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
            
            // ========== DETECÇÃO DE NOVA PESQUISA vs REFINAMENTO ==========
            // Se a query nova contém location, type ou rooms, é provável que seja uma nova pesquisa
            // e não apenas um refinamento (ex: "modernos" após "casas em porto")
            bool isNewSearch = incoming.ContainsKey("location") || 
                               incoming.ContainsKey("type") ||
                               incoming.ContainsKey("rooms") ||
                               incoming.ContainsKey("min_rooms") ||
                               incoming.ContainsKey("max_rooms");
            
            // Se é nova pesquisa, limpar features antigas para evitar acumulação indevida
            // Exemplo: "casas em rio tinto modernos" → "casas no porto" não deve manter "modernos"
            if (isNewSearch && result.ContainsKey("features"))
            {
                var oldFeatures = GetStringList(result["features"]);
                logger.LogInformation("Nova pesquisa detectada (location/type/rooms mudou) - limpando features antigas: {OldFeatures}", 
                    string.Join(", ", oldFeatures));
                result.Remove("features");
            }
            
            foreach (var kv in incoming)
            {
                // Se o filtro novo não estiver vazio, adiciona/substitui
                if (!IsEmpty(kv.Value))
                {
                    // ========== FEATURES: Acumular apenas em refinamentos, substituir em novas pesquisas ==========
                    if (kv.Key == "features")
                    {
                        var newFeatures = GetStringList(kv.Value);
                        
                        // Só acumular se NÃO for nova pesquisa E já existirem features
                        if (!isNewSearch && result.ContainsKey("features"))
                        {
                            var existingFeatures = GetStringList(result["features"]);
                            
                            // Acumular features únicas (refinamento)
                            var mergedFeatures = existingFeatures.Union(newFeatures).Distinct().ToList();
                            result[kv.Key] = mergedFeatures;
                            logger.LogDebug("Features acumuladas (refinamento): {Features}", string.Join(", ", mergedFeatures));
                        }
                        else
                        {
                            // Substituir features (nova pesquisa ou primeira vez)
                            result[kv.Key] = newFeatures;
                            logger.LogDebug("Features substituídas (nova pesquisa): {Features}", string.Join(", ", newFeatures));
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

        private static List<string> GetStringList(object value)
        {
            return value switch
            {
                List<string> list => list,
                List<object> objList => objList.Select(o => o?.ToString() ?? "").Where(s => !string.IsNullOrWhiteSpace(s)).ToList(),
                JsonElement element when element.ValueKind == JsonValueKind.Array => 
                    element.EnumerateArray().Select(e => e.GetString() ?? "").Where(s => !string.IsNullOrWhiteSpace(s)).ToList(),
                string str => new List<string> { str },
                _ => new List<string>()
            };
        }

        /// <summary>
        /// Expande features ABSTRATAS com sinónimos para melhorar matching nas descrições.
        /// Só processa features que JÁ EXISTEM no filtro (mencionadas explicitamente na query).
        /// 
        /// CRÍTICO: NÃO adiciona features novas, apenas expande as existentes.
        /// 
        /// Exemplos:
        /// - Input: ["familiar"] → Output: ["familiar", "espaçoso", "zona residencial"]
        /// - Input: ["segura"] → Output: ["segura", "zona segura", "condomínio fechado", "segurança"]
        /// - Input: ["jardim"] → Output: ["jardim"] (feature concreta, não expande)
        /// 
        /// RAZÃO: Garante consistência entre GPT-4o-mini e GPT-4o.
        /// </summary>
        private void EnrichAbstractFeatures(Dictionary<string, object> filters)
        {
            if (!filters.ContainsKey("features"))
                return;

            var existingFeatures = GetStringList(filters["features"]);
            var expandedFeatures = new List<string>(existingFeatures);

            // Mapeamento de features abstratas para sinónimos concretos
            var abstractFeatureMap = new Dictionary<string, string[]>(StringComparer.OrdinalIgnoreCase)
            {
                // Segurança
                ["segura"] = new[] { "zona segura", "condomínio fechado", "segurança", "portaria", "vigilância" },
                ["segurança"] = new[] { "zona segura", "condomínio fechado", "portaria", "vigilância" },
                
                // Familiar
                ["familiar"] = new[] { "espaçoso", "zona residencial", "zona familiar", "escolas próximas" },
                ["familia"] = new[] { "espaçoso", "zona residencial", "zona familiar", "escolas próximas" },
                
                // Tranquilidade
                ["tranquila"] = new[] { "zona tranquila", "zona calma", "sossegado", "pouco trânsito" },
                ["tranquilo"] = new[] { "zona tranquila", "zona calma", "sossegado", "pouco trânsito" },
                ["calma"] = new[] { "zona calma", "zona tranquila", "sossegado" },
                ["calmo"] = new[] { "zona calma", "zona tranquila", "sossegado" },
                ["sossegado"] = new[] { "zona tranquila", "zona calma", "pouco trânsito" },
                
                // Modernidade
                ["moderna"] = new[] { "moderno", "renovado", "contemporâneo", "recente" },
                ["moderno"] = new[] { "renovado", "contemporâneo", "recente" },
                
                // Luxo
                ["luxo"] = new[] { "luxuoso", "premium", "alto padrão", "acabamentos de qualidade" },
                ["luxuosa"] = new[] { "luxuoso", "premium", "alto padrão", "acabamentos de qualidade" },
                ["luxuoso"] = new[] { "premium", "alto padrão", "acabamentos de qualidade" },
                
                // Espaço
                ["espaçoso"] = new[] { "amplo", "grande", "áreas generosas" },
                ["espaçosa"] = new[] { "amplo", "grande", "áreas generosas" },
                ["amplo"] = new[] { "espaçoso", "grande", "áreas generosas" },
                ["ampla"] = new[] { "espaçoso", "grande", "áreas generosas" }
            };

            // Expandir apenas features abstratas que foram mencionadas
            foreach (var feature in existingFeatures)
            {
                if (abstractFeatureMap.TryGetValue(feature, out var synonyms))
                {
                    expandedFeatures.AddRange(synonyms);
                    _logger.LogInformation(
                        "[Features] Expandindo feature abstrata '{Feature}' com sinónimos: {Synonyms}",
                        feature,
                        string.Join(", ", synonyms));
                }
            }

            // Remover duplicados (case-insensitive)
            filters["features"] = expandedFeatures
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();
        }
    }
}
