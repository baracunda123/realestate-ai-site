namespace realestate_ia_site.Server.DTOs.Scraper
{
    public class ScrapperPropertyDto
    {
        public string preco { get; set; }
        public string caracteristicas { get; set; }
        public string predio { get; set; }
        public decimal equipamento { get; set; }
        public int certificado { get; set; }
        public List<string> descricao { get; set; }
        public string location { get; set; }
        public string url { get; set; }
        public string site { get; set; }
        public string title { get; set; }
        public int pageNumber { get; set; }
        public string extractedAt { get; set; }

    }
}
