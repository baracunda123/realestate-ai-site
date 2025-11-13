using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Infrastructure.AI;

namespace realestate_ia_site.Server.Application.Features.AI.Interfaces
{
    public interface IIntelligentRecommendationEngine
    {
        Task<RecommendationInsights> AnalyzeUserBehaviorAsync(
            UserBehaviorData behaviorData,
            CancellationToken cancellationToken = default);

        Task<string> ExplainRecommendationAsync(
            PropertySearchDto property,
            UserIntentAnalysis userIntent,
            string userPlan = "free",
            CancellationToken cancellationToken = default);

        Task<List<string>> GenerateSmartQuestionsAsync(
            UserIntentAnalysis userIntent,
            List<string> conversationHistory,
            string userPlan = "free",
            CancellationToken cancellationToken = default);
    }
}
