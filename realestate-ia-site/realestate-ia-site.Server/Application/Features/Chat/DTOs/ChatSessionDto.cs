namespace realestate_ia_site.Server.Application.Features.Chat.DTOs
{
    public class ChatSessionDto
    {
        public string Id { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsActive { get; set; }
        public int MessageCount { get; set; }
        public ChatMessageDto? LastMessage { get; set; }
    }

    public class ChatMessageDto
    {
        public string Id { get; set; } = string.Empty;
        public string SessionId { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Content { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
    }

    public class CreateChatSessionDto
    {
        public string? Title { get; set; }
    }

    public class UpdateChatSessionDto
    {
        public string? Title { get; set; }
        public bool? IsActive { get; set; }
    }

    public class ChatSessionWithMessagesDto
    {
        public string Id { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsActive { get; set; }
        public List<ChatMessageDto> Messages { get; set; } = new();
    }
}
