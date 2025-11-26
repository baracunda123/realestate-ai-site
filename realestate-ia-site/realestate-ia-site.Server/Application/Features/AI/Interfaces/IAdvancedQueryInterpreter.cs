using OpenAI.Chat;
using realestate_ia_site.Server.Infrastructure.AI;

namespace realestate_ia_site.Server.Application.Features.AI.Interfaces
{
    /// <summary>
    /// Interpretador avançado de queries. Usa UserRequestContext para modelo.
    /// </summary>
    public interface IAdvancedQueryInterpreter
    {
        Task<ComplexQueryInterpretation> InterpretComplexQueryAsync(
            string userQuery,
            IEnumerable<ChatMessage> conversationHistory,
            CancellationToken cancellationToken = default);

        Task<IntentChangeDetection> DetectIntentChangeAsync(
            string previousQuery,
            string currentQuery,
            CancellationToken cancellationToken = default);

        Task<List<string>> ExpandVagueQueryAsync(
            string vagueQuery,
            CancellationToken cancellationToken = default);

        Task<List<string>> SuggestRefinementsAsync(
            string originalQuery,
            int resultsCount,
            List<string> resultsSummary,
            CancellationToken cancellationToken = default);
    }
}
