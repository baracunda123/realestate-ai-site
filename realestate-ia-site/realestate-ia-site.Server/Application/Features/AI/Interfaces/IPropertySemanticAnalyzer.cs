using OpenAI.Chat;
using realestate_ia_site.Server.Infrastructure.AI;

namespace realestate_ia_site.Server.Application.Features.AI.Interfaces
{
    public interface IPropertySemanticAnalyzer
    {
        Task<PropertySemanticInsights> AnalyzeDescriptionAsync(
            string description,
            string propertyType,
            string location,
            CancellationToken cancellationToken = default);

        Task<string> ComparePropertiesAsync(
            PropertyComparisonRequest request,
            string userPlan = "free",
            CancellationToken cancellationToken = default);

        Task<UserIntentAnalysis> AnalyzeUserIntentAsync(
            string userQuery,
            IEnumerable<ChatMessage> conversationHistory,
            string userPlan = "free",
            CancellationToken cancellationToken = default);
    }
}
