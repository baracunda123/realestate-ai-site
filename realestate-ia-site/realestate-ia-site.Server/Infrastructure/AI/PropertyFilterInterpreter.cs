using OpenAI.Chat;
using realestate_ia_site.Server.Infrastructure.AI.Interfaces;
using realestate_ia_site.Server.Infrastructure.AI.Prompts;
using realestate_ia_site.Server.Domain.Models; // ADDED (ConversationContext)
using System.Text.Json;
using System.Linq;
using System.Collections.Generic;            // ADDED
using System;                                // ADDED for completeness

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public class PropertyFilterInterpreter : IPropertyFilterInterpreter
    {
        private readonly IOpenAIService _openAIService;
        private readonly ILogger<PropertyFilterInterpreter> _logger;
        private readonly IConversationContextService _contextService;
        private const int MaxContextMessages = 4; // menor porque usamos memória estruturada

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
            _logger.LogInformation("Extraindo filtros do texto: {Input}", userQuery);

            var context = !string.IsNullOrWhiteSpace(sessionId)
                ? await _contextService.GetOrCreateContextAsync(sessionId, cancellationToken)
                : null;

            var messages = BuildMessages(userQuery, context);

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 500,
                Temperature = 0.3f
            };

            try
            {
                var rawResponse = await _openAIService.CompleteChatAsync(messages, options, cancellationToken);
                var jsonText = ExtractFirstJsonObject(rawResponse);

                if (jsonText is null)
                {
                    _logger.LogWarning("Resposta da IA não contém JSON reconhecível. Resposta recebida: {Response}", rawResponse);
                    return context?.LastFilters ?? new Dictionary<string, object>();
                }

                Dictionary<string, object>? rawFilters;
                try
                {
                    rawFilters = JsonSerializer.Deserialize<Dictionary<string, object>>(jsonText);
                }
                catch (JsonException inner)
                {
                    _logger.LogError(inner, "Falha ao deserializar JSON extraído: {Json}", jsonText);
                    return context?.LastFilters ?? new Dictionary<string, object>();
                }

                rawFilters ??= new Dictionary<string, object>();
                NormalizeFilterValues(rawFilters);

                var merged = MergeWithPreviousFilters(context?.LastFilters, rawFilters);

                _logger.LogInformation("Filtros extraídos com sucesso: {FilterCount}", merged.Count);
                _logger.LogDebug("🔍 Filtros (merged): {@Filters}", merged);

                if (context != null && merged.Count > 0)
                {
                    context.LastFilters = merged;
                    context.LastQuery = userQuery;
                    _contextService.UpdateContext(sessionId!, context);
                }

                return merged;
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Operação cancelada durante extração de filtros");
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao extrair filtros. Input: {Input}", userQuery);
                return context?.LastFilters ?? new Dictionary<string, object>();
            }
        }

        private List<ChatMessage> BuildMessages(string userQuery, ConversationContext? context)
        {
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(AiPrompts.FilterExtraction)
            };

            if (context?.LastFilters is { Count: > 0 })
            {
                var summary = SummarizeFilters(context.LastFilters);
                messages.Add(new SystemChatMessage($"Contexto anterior (filtros ativos): {summary}"));
            }

            if (context != null)
            {
                var recent = context
                    .GetRecentMessages(maxCount: MaxContextMessages)
                    .Where(m => m is not SystemChatMessage)
                    .ToList();

                if (recent.Count > 0)
                    messages.AddRange(recent);
            }

            messages.Add(new UserChatMessage(userQuery));
            return messages;
        }

        private static Dictionary<string, object> MergeWithPreviousFilters(
            Dictionary<string, object>? previous,
            Dictionary<string, object> current)
        {
            if (current.Count == 0)
                return previous != null
                    ? new Dictionary<string, object>(previous)
                    : new Dictionary<string, object>();

            if (previous == null || previous.Count == 0)
                return current;

            var structuralKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                { "type", "location", "max_price", "rooms", "tags" };

            bool isIncremental = !current.Keys.Any(k => structuralKeys.Contains(k));

            var result = new Dictionary<string, object>(isIncremental ? previous : new Dictionary<string, object>());

            foreach (var kv in current)
                result[kv.Key] = kv.Value;

            return result;
        }

        private static string SummarizeFilters(Dictionary<string, object> filters)
        {
            var parts = new List<string>();

            if (filters.TryGetValue("type", out var type))
                parts.Add($"tipo={type}");
            if (filters.TryGetValue("location", out var loc))
                parts.Add($"loc={loc}");
            if (filters.TryGetValue("rooms", out var rooms))
                parts.Add($"quartos>={rooms}");
            if (filters.TryGetValue("max_price", out var price))
                parts.Add($"<=€{price}");
            if (filters.TryGetValue("tags", out var tagsObj))
            {
                var tagList = ExtractStringList(tagsObj);
                if (tagList.Count > 0)
                    parts.Add($"tags=[{string.Join(",", tagList)}]");
            }
            if (filters.TryGetValue("sort", out var sort))
                parts.Add($"ordenação={sort}");

            return parts.Count == 0 ? "(sem filtros estruturados)" : string.Join("; ", parts);
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