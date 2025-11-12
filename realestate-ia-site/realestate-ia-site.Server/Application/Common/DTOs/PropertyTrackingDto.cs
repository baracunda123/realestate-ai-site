namespace realestate_ia_site.Server.Application.Common.DTOs
{
    /// <summary>
    /// DTO para o crawler atualizar o tracking de anúncios
    /// </summary>
    public class PropertyTrackingUpdateDto
    {
        /// <summary>
        /// IDs dos anúncios que foram vistos no scraping atual
        /// </summary>
        public List<string> PropertyIds { get; set; } = new();

        /// <summary>
        /// Source do scraping (CasaSapo, Idealista, etc)
        /// </summary>
        public string SourceSite { get; set; } = string.Empty;
    }

    /// <summary>
    /// Resposta do endpoint de tracking
    /// </summary>
    public class PropertyTrackingUpdateResponse
    {
        public int UpdatedCount { get; set; }
        public int ArchivedCount { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}
