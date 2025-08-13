using OpenAI.Chat;

namespace realestate_ia_site.Server.Domain.Models
{
    public sealed class ConversationContext
    {
        public string SessionId { get; init; } = string.Empty;
        public List<ChatMessage> Messages { get; init; } = new();
        public DateTime LastActivity { get; set; } = DateTime.UtcNow;
        public Dictionary<string, object>? LastFilters { get; set; }
        public string? LastQuery { get; set; }

        public void AddUserMessage(string message)
        {
            Messages.Add(new UserChatMessage(message));
            LastActivity = DateTime.UtcNow;
            LastQuery = message;
        }

        public void AddAssistantMessage(string message)
        {
            Messages.Add(new AssistantChatMessage(message));
            LastActivity = DateTime.UtcNow;
        }

        public void AddSystemMessage(string message)
        {
            Messages.Add(new SystemChatMessage(message));
            LastActivity = DateTime.UtcNow;
        }

        public bool IsExpired(TimeSpan maxAge)
        {
            return DateTime.UtcNow - LastActivity > maxAge;
        }

        public IReadOnlyList<ChatMessage> GetRecentMessages(int maxCount = 10)
        {
            // CORRIGIDO: Só retorna user/assistant messages (não system)
            // O PromptBuilder é responsável pelas system messages
            return Messages
                .Where(m => m is UserChatMessage || m is AssistantChatMessage)
                .TakeLast(maxCount)
                .ToList()
                .AsReadOnly();
        }
    }
}