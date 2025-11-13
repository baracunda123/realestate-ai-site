using realestate_ia_site.Server.Infrastructure.AI;

namespace realestate_ia_site.Server.Application.Features.AI.Interfaces
{
    public interface IAdvancedQueryInterpreter
    {
        Task<ComplexQueryInterpretation> InterpretComplexQueryAsync(
            string userQuery,
            string conversationContext,
            CancellationToken cancellationToken = default);

        Task<IntentChangeDetection> DetectIntentChangeAsync(
            string previousQuery,
            string currentQuery,
            CancellationToken cancellationToken = default);

        Task<List<string>> ExpandVagueQueryAsync(
            string vagueQuery,
            string userPlan = "free",
            CancellationToken cancellationToken = default);

        Task<List<string>> SuggestRefinementsAsync(
            string originalQuery,
            int resultsCount,
            List<string> resultsSummary,
            string userPlan = "free",
            CancellationToken cancellationToken = default);
    }
}
