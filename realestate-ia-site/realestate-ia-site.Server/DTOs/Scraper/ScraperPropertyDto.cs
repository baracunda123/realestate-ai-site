namespace realestate_ia_site.Server.DTOs.Scraper
{
    public class ScraperPropertyDto
    {
        public string? preco { get; set; }
        public string? caracteristicas { get; set; }
        public string? predio { get; set; }
        public string? equipamento { get; set; }
        public string? certificado { get; set; }
        public string? descricao { get; set; }
        public string? location { get; set; }
        public string? url { get; set; }
        public string? site { get; set; }
        public string? titleFromListing { get; set; }
        public int? pageNumber { get; set; }
        public string? extractedAt { get; set; }

    }
}
