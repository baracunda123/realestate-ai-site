using OpenAI.Chat;

namespace realestate_ia_site.Server.Infrastructure.AI.Interfaces
{
    public interface IOpenAIService
    {
        Task<string> CompleteChatAsync(List<ChatMessage> messages, ChatCompletionOptions options, CancellationToken cancellationToken = default);
    }
}