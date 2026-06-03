using realestate_ia_site.Server.Application.ExternalServices.Models;

namespace realestate_ia_site.Server.Application.ExternalServices.Interfaces
{
    /// <summary>
    /// Contract for geocoding services that parse free-text locations into structured components.
    /// </summary>
    public interface IGeocodingService
    {
        /// <summary>
        /// Parses a location text into structured city, state, county and civil parish components.
        /// </summary>
        Task<GeocodedLocation> ParseLocationAsync(string locationText, string countryCode = "PT");
    }
}
