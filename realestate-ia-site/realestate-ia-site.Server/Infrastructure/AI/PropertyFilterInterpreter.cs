using OpenAI.Chat;
using realestate_ia_site.Server.Infrastructure.AI.Interfaces;
using realestate_ia_site.Server.Infrastructure.AI.Prompts;
using realestate_ia_site.Server.Infrastructure.AI.Core; // ADDED
using realestate_ia_site.Server.Domain.Models;
using System.Text.Json;
using System.Linq;
using System.Collections.Generic;
using System;

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
        {
            var context = !string.IsNullOrWhiteSpace(sessionId)
                ? await _contextService.GetOrCreateContextAsync(sessionId, cancellationToken)
                : null;

            // Usar o PromptBuilder
            var messages = PromptBuilder.BuildForFilterExtraction(userQuery, context?.LastFilters);

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 300,
                Temperature = 0.2f
            };

            try
            {
                var response = await _openAIService.CompleteChatAsync(messages, options, cancellationToken);
                var filters = ParseFiltersFromResponse(response);
                
                // Salvar no contexto
                if (context != null && filters.Any())
                {
                    context.LastFilters = MergeFilters(context.LastFilters, filters);
                    _contextService.UpdateContext(sessionId, context);
                }

                return filters;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao extrair filtros");
                return context?.LastFilters ?? new Dictionary<string, object>();
            }
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
            }
            catch (JsonException)
            {
                // Se não conseguir fazer parse, retorna vazio
            }

            return new Dictionary<string, object>();
        }

        private static Dictionary<string, object> MergeFilters(
            Dictionary<string, object>? previous,
            Dictionary<string, object> current)
        {
            // Se não há filtros novos, retorna os anteriores (ou vazio)
            if (current.Count == 0)
                return previous != null
                    ? new Dictionary<string, object>(previous)
                    : new Dictionary<string, object>();

            // Se não há filtros anteriores, retorna os novos
            if (previous == null || previous.Count == 0)
                return current;

            // Filtros que substituem completamente quando especificados
            var replacingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { "type", "location", "max_price", "rooms" };

            // Se algum filtro estrutural foi especificado, começa com base limpa
            bool hasStructuralChange = current.Keys.Any(k => replacingKeys.Contains(k));
            
            var result = hasStructuralChange 
                ? new Dictionary<string, object>() 
                : new Dictionary<string, object>(previous);

            // Se houve mudança estrutural, preserva apenas tags dos filtros anteriores (podem ser cumulativas)
            if (hasStructuralChange && previous.ContainsKey("tags"))
            {
                result["tags"] = previous["tags"];
            }

            // Aplica todos os filtros novos
            foreach (var kv in current)
            {
                if (kv.Key.Equals("tags", StringComparison.OrdinalIgnoreCase))
                {
                    // Tags podem ser cumulativas se não houver mudança estrutural major
                    if (!hasStructuralChange && result.ContainsKey("tags"))
                    {
                        var existingTags = ExtractStringList(result["tags"]);
                        var newTags = ExtractStringList(kv.Value);
                        var combined = existingTags.Union(newTags, StringComparer.OrdinalIgnoreCase).ToList();
                        result[kv.Key] = combined;
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
            }

            return result;
        }

        private static List<string> ExtractStringList(object value)
        {
            var result = new List<string>();

            switch (value)
            {
                case JsonElement je when je.ValueKind == JsonValueKind.Array:
                    foreach (var item in je.EnumerateArray())
                        if (item.ValueKind == JsonValueKind.String)
                            result.Add(item.GetString()!);
                    break;
                case IEnumerable<object> objEnum:
                    foreach (var item in objEnum)
                    {
                        var s = item?.ToString();
                        if (!string.IsNullOrWhiteSpace(s))
                            result.Add(s);
                    }
                    break;
            }

            return result;
        }

        private static void NormalizeFilterValues(Dictionary<string, object> filters)
        {
            var keys = filters.Keys.ToList();

            foreach (var key in keys)
            {
                var val = filters[key];
                if (val is JsonElement je)
                {
                    filters[key] = je.ValueKind switch
                    {
                        JsonValueKind.String => je.GetString()!,
                        JsonValueKind.Number => je.TryGetInt64(out var l) ? l : je.GetDouble(),
                        JsonValueKind.True => true,
                        JsonValueKind.False => false,
                        JsonValueKind.Array => ExtractStringList(je),
                        _ => val
                    };
                }
            }
        }

        private static string? ExtractFirstJsonObject(string input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return null;

            int start = input.IndexOf('{');
            if (start < 0) return null;

            int depth = 0;
            for (int i = start; i < input.Length; i++)
            {
                var c = input[i];
                if (c == '{') depth++;
                else if (c == '}')
                {
                    depth--;
                    if (depth == 0)
                        return input.Substring(start, i - start + 1);
                }
            }
            return null;
        }
    }
}