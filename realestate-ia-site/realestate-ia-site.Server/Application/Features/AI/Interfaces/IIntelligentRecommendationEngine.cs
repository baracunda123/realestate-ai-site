using OpenAI.Chat;
using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Infrastructure.AI;

namespace realestate_ia_site.Server.Application.Features.AI.Interfaces
{
    /// <summary>
    /// Motor de recomendações inteligentes. Usa UserRequestContext para modelo.
    /// </summary>
    public interface IIntelligentRecommendationEngine
    {
        Task<RecommendationInsights> AnalyzeUserBehaviorAsync(
            UserBehaviorData behaviorData,
            CancellationToken cancellationToken = default);

        Task<string> ExplainRecommendationAsync(
            PropertySearchDto property,
            UserIntentAnalysis userIntent,
            CancellationToken cancellationToken = default);

        Task<List<string>> GenerateSmartQuestionsAsync(
            UserIntentAnalysis userIntent,
            IEnumerable<ChatMessage> conversationHistory,
            CancellationToken cancellationToken = default);
    }
}
