using OpenAI.Chat;
using realestate_ia_site.Server.Application.AI.Interfaces;
using realestate_ia_site.Server.Infrastructure.AI.Prompts;
using realestate_ia_site.Server.Infrastructure.AI.Core;
using System.Text.Json;
using realestate_ia_site.Server.Application.AI.Conversation;

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

        private static Dictionary<string, object> MergeFilters(Dictionary<string, object> existing, Dictionary<string, object> incoming)
        {
            var result = new Dictionary<string, object>(existing);
            foreach (var kv in incoming)
            {
                if (!result.ContainsKey(kv.Key) || IsEmpty(result[kv.Key]))
                {
                    result[kv.Key] = kv.Value;
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