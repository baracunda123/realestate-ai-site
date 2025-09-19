namespace realestate_ia_site.Server.Application.PropertyAlerts.DTOs
{
    public class PropertyAlertNotificationDto
    {
        public Guid Id { get; set; }
        public required string PropertyId { get; set; }
        public required string Title { get; set; }
        public required string Message { get; set; }
        public required string AlertType { get; set; }
        public DateTime CreatedAt { get; set; }
        public bool IsRead { get; set; }
        
        // Dados da propriedade para display
        public string? PropertyTitle { get; set; }
        public string? PropertyLocation { get; set; }
        public decimal? PropertyPrice { get; set; }
        public decimal? OldPrice { get; set; }
        public int? Bedrooms { get; set; }
        public string? PropertyType { get; set; }
    }

    public class AlertNotificationsResponseDto
    {
        public List<PropertyAlertNotificationDto> Notifications { get; set; } = new();
        public int TotalCount { get; set; }
        public int UnreadCount { get; set; }
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }

    public class AlertStatsDto
    {
        public int TotalNotifications { get; set; }
        public int UnreadNotifications { get; set; }
        public int NewListingAlerts { get; set; }
        public int PriceDropAlerts { get; set; }
        public DateTime? LastNotification { get; set; }
    }
}