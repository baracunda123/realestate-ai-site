using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.Features.AI.Conversation;

namespace realestate_ia_site.Server.Application.Features.AI.Interfaces
{
    public interface IPropertyResponseGenerator
    {
        /// <summary>
        /// Gera resposta conversacional usando contexto de conversa
        /// </summary>
        Task<string> GenerateResponseAsync(
            string originalQuery,
            List<PropertySearchDto> properties,
            ConversationContext? context,
            string userPlan,
            CancellationToken cancellationToken = default);
    }
}
