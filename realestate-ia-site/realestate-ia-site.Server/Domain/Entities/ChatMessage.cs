namespace realestate_ia_site.Server.Domain.Entities
{
    /// <summary>
    /// Representa uma mensagem individual numa sessão de chat
    /// </summary>
    public class ChatMessage
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string SessionId { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // "user" | "assistant" | "system"
        public string Content { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        
        // Navigation property
        public virtual ChatSession? Session { get; set; }
    }
}
