using realestate_ia_site.Server.Application.Features.AI.Conversation;
using realestate_ia_site.Server.Domain.Models;

namespace realestate_ia_site.Server.Application.Features.AI.Interfaces
{
    public interface IConversationContextService
    {
        ConversationContext GetOrCreateContext(string sessionId);
        void UpdateContext(string sessionId, ConversationContext context);
        void ClearExpiredContexts();
        Task<ConversationContext> GetOrCreateContextAsync(string sessionId, CancellationToken cancellationToken = default);
    
        /// <summary>
        /// Remove completamente o contexto da conversa para uma sessão especí́fica
        /// </summary>
        void ClearContext(string sessionId);
    
        /// <summary>
        /// Remove completamente o contexto da conversa para uma sessão especí́fica (async)
        /// </summary>
        Task ClearContextAsync(string sessionId, CancellationToken cancellationToken = default);
    }
}