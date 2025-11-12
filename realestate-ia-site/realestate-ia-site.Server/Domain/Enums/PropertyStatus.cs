namespace realestate_ia_site.Server.Domain.Enums
{
    /// <summary>
    /// Status do anúncio baseado na última vez que foi visto no scraping
    /// </summary>
    public enum PropertyStatus
    {
        /// <summary>
        /// Anúncio ativo - visto recentemente no scraping
        /// </summary>
        Active = 0,
        
        /// <summary>
        /// Anúncio arquivado - fora do período de scraping (180 dias CasaSapo, 30 dias Idealista)
        /// </summary>
        Archived = 1,
        
        /// <summary>
        /// Anúncio marcado para eliminação - arquivado há muito tempo
        /// </summary>
        Expired = 2
    }
}
