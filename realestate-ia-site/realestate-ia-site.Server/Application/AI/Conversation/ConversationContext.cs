using OpenAI.Chat;

namespace realestate_ia_site.Server.Application.AI.Conversation;

public class ConversationContext
{
    public string SessionId { get; set; } = string.Empty;
    public List<ChatMessage> Messages { get; } = new();
    public Dictionary<string, object> LastFilters { get; set; } = new();
    public DateTime LastActivity { get; private set; } = DateTime.UtcNow;
    public string? LastQuery { get; private set; }

    public void AddUserMessage(string content)
    {
        if (string.IsNullOrWhiteSpace(content)) return;
        Messages.Add(new UserChatMessage(content));
        LastQuery = content;
        Touch();
    }

    public void AddAssistantMessage(string content)
    {
        if (string.IsNullOrWhiteSpace(content)) return;
        Messages.Add(new AssistantChatMessage(content));
        Touch();
    }

    public IEnumerable<ChatMessage> GetRecentMessages(int max = 12)
        => Messages.Where(m => m is UserChatMessage || m is AssistantChatMessage).TakeLast(Math.Max(1, max));

    public bool IsExpired(TimeSpan maxAge) => DateTime.UtcNow - LastActivity > maxAge;

    private void Touch() => LastActivity = DateTime.UtcNow;
}
