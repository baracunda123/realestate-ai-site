using realestate_ia_site.Server.Application.Common.DTOs;

namespace realestate_ia_site.Server.Application.Features.Properties.Scoring
{
    /// <summary>
    /// Serviço responsável por pontuar e ordenar propriedades baseado no contexto conversacional
    /// e histórico de refinamentos do usuário.
    /// </summary>
    public interface IPropertyScoringService
    {
        /// <summary>
        /// Pontua e ordena propriedades baseado no contexto da conversa e intenção do usuário.
        /// </summary>
        /// <param name="properties">Lista de propriedades a serem pontuadas</param>
        /// <param name="userQuery">Query original do usuário</param>
        /// <param name="sessionId">ID da sessão para contexto conversacional</param>
        /// <param name="filters">Filtros aplicados na pesquisa</param>
        /// <param name="cancellationToken">Token de cancelamento</param>
        /// <returns>Lista ordenada de propriedades com scores</returns>
        Task<List<PropertySearchDto>> ScoreAndRankPropertiesAsync(
            List<PropertySearchDto> properties,
            string userQuery,
            string sessionId,
            Dictionary<string, object> filters,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Aprende com o padrão de refinamento do usuário para melhorar futuras recomendações.
        /// </summary>
        Task LearnFromRefinementAsync(
            string sessionId,
            string userId,
            Dictionary<string, object> previousFilters,
            Dictionary<string, object> newFilters,
            CancellationToken cancellationToken = default);
    }
}
