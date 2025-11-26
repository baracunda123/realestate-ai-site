using realestate_ia_site.Server.Application.Features.AI.Conversation;

namespace realestate_ia_site.Server.Application.Features.AI.Interfaces
{
    public interface IConversationContextService
    {
        ConversationContext GetOrCreateContext(string sessionId);
        Task UpdateContextAsync(string sessionId, ConversationContext context, CancellationToken cancellationToken = default);
        Task ClearContextAsync(string sessionId, CancellationToken cancellationToken = default);
        Task ClearExpiredContextsAsync(CancellationToken cancellationToken = default);
        Task<ConversationContext> GetOrCreateContextAsync(string sessionId, CancellationToken cancellationToken = default);
        ConversationContext? RestoreContextFromDatabase(string sessionId);
    }
}