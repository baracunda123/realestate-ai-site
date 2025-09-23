using System.ComponentModel.DataAnnotations;

namespace realestate_ia_site.Server.Application.PropertyAlerts.DTOs
{
    // DTO para alertas de redução de preço
    public class PropertyAlertDto
    {
        public Guid Id { get; set; }
        public required string UserId { get; set; }
        public required string PropertyId { get; set; }
        public required string PropertyTitle { get; set; }
        public required string PropertyLocation { get; set; }
        public decimal CurrentPrice { get; set; }
        public int AlertThresholdPercentage { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastTriggered { get; set; }
        public int NotificationCount { get; set; }
    }

    // Request para criar alerta de redução de preço
    public class CreatePriceAlertRequestDto
    {
        [Required(ErrorMessage = "ID da propriedade é obrigatório")]
        public required string PropertyId { get; set; }

        [Range(1, 50, ErrorMessage = "Percentual deve estar entre 1% e 50%")]
        public int AlertThresholdPercentage { get; set; } = 5;
    }

    // Request para atualizar alerta
    public class UpdatePriceAlertRequestDto
    {
        [Range(1, 50, ErrorMessage = "Percentual deve estar entre 1% e 50%")]
        public int? AlertThresholdPercentage { get; set; }

        public bool? IsActive { get; set; }
    }

    // Response para listar alertas
    public class AlertsResponseDto
    {
        public List<PropertyAlertDto> Alerts { get; set; } = new();
        public int TotalCount { get; set; }
        public int ActiveCount { get; set; }
    }

    // DTO para notificações de redução de preço
    public class PropertyAlertNotificationDto
    {
        public Guid Id { get; set; }
        public string PropertyId { get; set; } = string.Empty;
        public string PropertyTitle { get; set; } = string.Empty;
        public string PropertyLocation { get; set; } = string.Empty;
        public decimal CurrentPrice { get; set; }
        public decimal OldPrice { get; set; }
        public decimal SavingsAmount { get; set; }
        public decimal SavingsPercentage { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsRead { get; set; }
    }

    // Response para notificações
    public class AlertNotificationsResponseDto
    {
        public List<PropertyAlertNotificationDto> Notifications { get; set; } = new();
        public int TotalCount { get; set; }
        public int UnreadCount { get; set; }
    }
}