using OpenAI.Chat;
using realestate_ia_site.Server.Infrastructure.AI;

namespace realestate_ia_site.Server.Application.Features.AI.Interfaces
{
    /// <summary>
    /// Analisador semântico para interpretar intenções e comparar propriedades.
    /// </summary>
    public interface IPropertySemanticAnalyzer
    {
        Task<UserIntentAnalysis> AnalyzeUserIntentAsync(
            string userQuery,
            IEnumerable<ChatMessage> conversationHistory,
            CancellationToken cancellationToken = default);

        Task<string> ComparePropertiesAsync(
            PropertyComparisonRequest request,
            CancellationToken cancellationToken = default);
    }
}
