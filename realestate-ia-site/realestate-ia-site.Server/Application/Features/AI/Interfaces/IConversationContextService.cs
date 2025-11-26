using realestate_ia_site.Server.Application.Features.AI.Conversation;

namespace realestate_ia_site.Server.Application.Features.AI.Interfaces
{
    public interface IConversationContextService
    {
        ConversationContext GetOrCreateContext(string sessionId);
        ConversationContext? GetContext(string sessionId);
        Task UpdateContextAsync(string sessionId, ConversationContext context, CancellationToken cancellationToken = default);
        void ClearContext(string sessionId);
        void ClearExpiredContexts();
        Task<ConversationContext> GetOrCreateContextAsync(string sessionId, CancellationToken cancellationToken = default);
        ConversationContext? RestoreContextFromDatabase(string sessionId);
    }
}