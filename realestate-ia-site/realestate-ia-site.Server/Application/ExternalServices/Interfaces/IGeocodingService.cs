using realestate_ia_site.Server.Application.ExternalServices.Models;

namespace realestate_ia_site.Server.Application.ExternalServices.Interfaces
{
    /// <summary>
    /// Interface para serviços de geocodificação (conversão de endereço em componentes estruturados)
    /// </summary>
    public interface IGeocodingService
    {
        /// <summary>
        /// Converte um texto de localização em componentes estruturados (cidade, concelho, freguesia, estado)
        /// </summary>
        /// <param name="locationText">Texto da localização a ser processado</param>
        /// <param name="countryCode">Código do país (padrão: PT)</param>
        /// <returns>Localização estruturada com cidade, estado, concelho e freguesia</returns>
        Task<GeocodedLocation> ParseLocationAsync(string locationText, string countryCode = "PT");
    }
}

namespace realestate_ia_site.Server.Application.ExternalServices.Models
{
    /// <summary>
    /// Representa uma localização estruturada obtida por geocodificação
    /// </summary>
    public class GeocodedLocation
    {
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string County { get; set; } = string.Empty;
        public string CivilParish { get; set; } = string.Empty;
    }
}
