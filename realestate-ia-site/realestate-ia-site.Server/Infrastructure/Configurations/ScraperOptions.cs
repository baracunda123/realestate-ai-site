using System.ComponentModel.DataAnnotations;

namespace realestate_ia_site.Server.Infrastructure.Configurations
{
    public class ScraperOptions
    {
        public const string SectionName = "Scraper";

        [Required]
        public string ApiKey { get; set; } = string.Empty;

        [Required]
        public string UserAgent { get; set; } = string.Empty;

        public List<string> AllowedEndpoints { get; set; } = new();

        public bool IsValidApiKey(string? apiKey)
        {
            return !string.IsNullOrEmpty(apiKey) && apiKey == ApiKey;
        }

        public bool IsAllowedEndpoint(string path)
        {
            return AllowedEndpoints.Any(endpoint => 
                path.Equals(endpoint, StringComparison.OrdinalIgnoreCase) ||
                path.StartsWith(endpoint, StringComparison.OrdinalIgnoreCase));
        }
    }
}
