namespace realestate_ia_site.Server.Application.ExternalServices.Models
{
    /// <summary>
    /// Represents a structured location obtained through geocoding.
    /// </summary>
    public class GeocodedLocation
    {
        public string City { get; set; } = string.Empty;
        public string State { get; set; } = string.Empty;
        public string County { get; set; } = string.Empty;
        public string CivilParish { get; set; } = string.Empty;
    }
}
