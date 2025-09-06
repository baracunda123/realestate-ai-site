using OpenAI.Chat;
using realestate_ia_site.Server.Application.DTOs.PropertySearch;
using realestate_ia_site.Server.Infrastructure.AI.Prompts;

namespace realestate_ia_site.Server.Infrastructure.AI.Core
{
    public static class PromptBuilder
    {
        public static List<ChatMessage> BuildForFilterExtraction(string userQuery, Dictionary<string, object>? lastFilters = null)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(userQuery, nameof(userQuery));

            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(AiPrompts.BaseAssistant),
                new SystemChatMessage(AiPrompts.GetFilterExtractionContext())
            };

            if (lastFilters?.Any() == true)
            {
                var filterSummary = string.Join(", ", lastFilters.Select(kv => $"{kv.Key}={kv.Value}"));
                messages.Add(new SystemChatMessage($"Filtros ativos: {filterSummary}"));
            }

            messages.Add(new UserChatMessage(userQuery));
            return messages;
        }

        public static List<ChatMessage> BuildForResponse(
            string userQuery,
            List<PropertySearchDto> properties,
            List<ChatMessage>? conversationHistory = null,
            bool isRefinement = false)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(userQuery, nameof(userQuery));
            ArgumentNullException.ThrowIfNull(properties, nameof(properties));

            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(AiPrompts.BaseAssistant),
                new SystemChatMessage(AiPrompts.GetConversationalContext(properties.Count, isRefinement))
            };

            if (conversationHistory?.Any() == true)
            {
                var recentHistory = conversationHistory
                    .Where(m => m is not SystemChatMessage)
                    .TakeLast(4)
                    .ToList();
                messages.AddRange(recentHistory);
            }

            messages.Add(new UserChatMessage(userQuery));

            var propertiesList = FormatPropertiesForAI(properties);
            messages.Add(new SystemChatMessage($"Propriedades disponíveis:\n{propertiesList}"));

            return messages;
        }

        public static List<ChatMessage> BuildForLocationExpansion(string location)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(location, nameof(location));

            return new List<ChatMessage>
            {
                new SystemChatMessage(AiPrompts.GetLocationContext()),
                new UserChatMessage(location)
            };
        }

        private static string FormatPropertiesForAI(List<PropertySearchDto> properties)
        {
            if (!properties.Any())
                return "Nenhuma propriedade encontrada para os critérios especificados.";

            return string.Join("\n", properties.Select((p, index) =>
            {
                var num = index + 1;
                var type = string.IsNullOrWhiteSpace(p.Type) ? "Imóvel" : p.Type;
                var loc = string.IsNullOrWhiteSpace(p.Location) ? "localização não indicada" : p.Location;
                var price = p.Price > 0 ? $"€{p.Price:N0}" : "preço sob consulta";
                var rooms = p.Bedrooms > 0 ? $"{p.Bedrooms} quartos" : null;
                var area = p.Area > 0 ? $"{p.Area:N0} m²" : null;
                var title = string.IsNullOrWhiteSpace(p.Title) ? null : p.Title;

                var parts = new[] { type, "em " + loc, rooms, area, price }
                    .Where(s => !string.IsNullOrWhiteSpace(s));
                var core = string.Join(", ", parts);
                var tail = string.IsNullOrWhiteSpace(p.ImageUrl) ? "" : $" ({p.ImageUrl})";

                return $"PROP[{num}] {core}{(title != null ? $" - {title}" : "")}{tail}";
            }));
        }
    }
}