namespace realestate_ia_site.Server.Application.Features.Properties.Analysis
{
    /// <summary>
    /// Serviço que usa IA para analisar descrições de propriedades e extrair features específicas.
    /// </summary>
    public interface IPropertyDescriptionAnalyzer
    {
        /// <summary>
        /// Analisa a descrição de uma propriedade e extrai features/características específicas.
        /// </summary>
        /// <param name="description">Descrição da propriedade</param>
        /// <param name="cancellationToken">Token de cancelamento</param>
        /// <returns>Lista de features/tags extraídas</returns>
        Task<List<string>> ExtractFeaturesAsync(string description, CancellationToken cancellationToken = default);

        /// <summary>
        /// Verifica se uma descrição contém features específicas solicitadas pelo usuário.
        /// </summary>
        /// <param name="description">Descrição da propriedade</param>
        /// <param name="requestedFeatures">Features que o usuário está procurando</param>
        /// <param name="cancellationToken">Token de cancelamento</param>
        /// <returns>Score de match (0.0 a 1.0) e features encontradas</returns>
        Task<(double matchScore, List<string> foundFeatures)> MatchFeaturesAsync(
            string description,
            List<string> requestedFeatures,
            CancellationToken cancellationToken = default);
    }
}
