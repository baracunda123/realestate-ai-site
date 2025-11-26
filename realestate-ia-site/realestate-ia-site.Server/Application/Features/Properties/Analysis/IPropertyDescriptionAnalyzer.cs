namespace realestate_ia_site.Server.Application.Features.Properties.Analysis
{
    /// <summary>
    /// Serviço que usa IA para analisar descrições de propriedades e encontrar features específicas.
    /// </summary>
    public interface IPropertyDescriptionAnalyzer
    {
        /// <summary>
        /// Verifica se uma descrição contém features específicas solicitadas pelo utilizador.
        /// Usa UserRequestContext para determinar o modelo a usar.
        /// </summary>
        /// <param name="description">Descrição da propriedade</param>
        /// <param name="requestedFeatures">Features que o utilizador está a procurar</param>
        /// <param name="cancellationToken">Token de cancelamento</param>
        /// <returns>Score de match (0.0 a 1.0) e features encontradas</returns>
        Task<(double matchScore, List<string> foundFeatures)> MatchFeaturesAsync(
            string description,
            List<string> requestedFeatures,
            CancellationToken cancellationToken = default);
    }
}
