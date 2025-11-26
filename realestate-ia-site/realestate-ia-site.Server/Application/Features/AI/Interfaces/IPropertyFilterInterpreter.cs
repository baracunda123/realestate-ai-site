using realestate_ia_site.Server.Application.Features.AI.Conversation;
using realestate_ia_site.Server.Infrastructure.AI;

namespace realestate_ia_site.Server.Application.Features.AI.Interfaces
{
    public interface IPropertyFilterInterpreter
    {
        /// <summary>
        /// Extrai filtros da query do utilizador usando contexto de conversa.
        /// Usa UserRequestContext para determinar o modelo.
        /// </summary>
        Task<Dictionary<string, object>> ExtractFiltersAsync(
            string userQuery, 
            ConversationContext? context, 
            UserIntentAnalysis? userIntent,
            ComplexQueryInterpretation? complexInterpretation = null,
            CancellationToken cancellationToken = default);
    }
}
