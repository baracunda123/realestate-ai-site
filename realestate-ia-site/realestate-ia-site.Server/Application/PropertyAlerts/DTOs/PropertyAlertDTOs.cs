using System.ComponentModel.DataAnnotations;

namespace realestate_ia_site.Server.Application.PropertyAlerts.DTOs
{
    public class PropertyAlertDto
    {
        public Guid Id { get; set; }
        public required string UserId { get; set; }
        public required string Name { get; set; }
        public string? Location { get; set; }
        public string? PropertyType { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int? Bedrooms { get; set; }
        public int? Bathrooms { get; set; }
        public bool PriceDropAlerts { get; set; }
        public bool NewListingAlerts { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastTriggered { get; set; }
        public int MatchCount { get; set; }
        public int NewMatches { get; set; }
    }

    public class CreateAlertRequestDto
    {
        [Required(ErrorMessage = "Nome do alerta é obrigatório")]
        [StringLength(200, ErrorMessage = "Nome deve ter no máximo 200 caracteres")]
        public required string Name { get; set; }

        [StringLength(500, ErrorMessage = "Localização deve ter no máximo 500 caracteres")]
        public string? Location { get; set; }

        [StringLength(50, ErrorMessage = "Tipo de propriedade deve ter no máximo 50 caracteres")]
        public string? PropertyType { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Preço mínimo deve ser positivo")]
        public decimal? MinPrice { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Preço máximo deve ser positivo")]
        public decimal? MaxPrice { get; set; }

        [Range(1, 20, ErrorMessage = "Quartos deve estar entre 1 e 20")]
        public int? Bedrooms { get; set; }

        [Range(1, 20, ErrorMessage = "Casas de banho deve estar entre 1 e 20")]
        public int? Bathrooms { get; set; }

        public bool PriceDropAlerts { get; set; } = true;
        public bool NewListingAlerts { get; set; } = true;
    }

    public class UpdateAlertRequestDto
    {
        [StringLength(200, ErrorMessage = "Nome deve ter no máximo 200 caracteres")]
        public string? Name { get; set; }

        [StringLength(500, ErrorMessage = "Localização deve ter no máximo 500 caracteres")]
        public string? Location { get; set; }

        [StringLength(50, ErrorMessage = "Tipo de propriedade deve ter no máximo 50 caracteres")]
        public string? PropertyType { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Preço mínimo deve ser positivo")]
        public decimal? MinPrice { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Preço máximo deve ser positivo")]
        public decimal? MaxPrice { get; set; }

        [Range(1, 20, ErrorMessage = "Quartos deve estar entre 1 e 20")]
        public int? Bedrooms { get; set; }

        [Range(1, 20, ErrorMessage = "Casas de banho deve estar entre 1 e 20")]
        public int? Bathrooms { get; set; }

        public bool? PriceDropAlerts { get; set; }
        public bool? NewListingAlerts { get; set; }
        public bool? IsActive { get; set; }
    }

    public class ToggleAlertRequestDto
    {
        [Required]
        public bool IsActive { get; set; }
    }

    public class AlertsResponseDto
    {
        public List<PropertyAlertDto> Alerts { get; set; } = new();
        public int TotalCount { get; set; }
        public int ActiveCount { get; set; }
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }

    public class AlertTestResponseDto
    {
        public List<PropertyMatchDto> PotentialMatches { get; set; } = new();
        public int EstimatedMatchCount { get; set; }
        public List<string> Recommendations { get; set; } = new();
    }

    public class PropertyMatchDto
    {
        public required string Id { get; set; }
        public required string Title { get; set; }
        public string? Location { get; set; }
        public decimal Price { get; set; }
        public int? Bedrooms { get; set; }
        public int? Bathrooms { get; set; }
        public string? PropertyType { get; set; }
        public DateTime ListingDate { get; set; }
        public bool IsNew { get; set; }
    }
}