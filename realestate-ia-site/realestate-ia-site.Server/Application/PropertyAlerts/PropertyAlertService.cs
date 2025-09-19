using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Application.PropertyAlerts.DTOs;

namespace realestate_ia_site.Server.Application.PropertyAlerts
{
    // Application Service responsável por coordenar regras de alertas e criar notificações no site
    public class PropertyAlertService
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<PropertyAlertService> _logger;

        public PropertyAlertService(
            IApplicationDbContext context,
            ILogger<PropertyAlertService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task ProcessNewPropertyAsync(Property property, CancellationToken cancellationToken = default)
        {
            var matchingAlerts = await GetMatchingAlertsAsync(property, cancellationToken);
            
            foreach (var alert in matchingAlerts)
            {
                if (alert.NewListingAlerts)
                {
                    await CreateAlertNotificationAsync(alert, property, "new_listing", cancellationToken);
                    alert.LastTriggered = DateTime.UtcNow;
                    alert.NewMatches++;
                }
            }
            
            if (matchingAlerts.Any())
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        public async Task ProcessPriceChangeAsync(Property property, decimal oldPrice, CancellationToken cancellationToken = default)
        {
            if (property.Price >= oldPrice) return; // Só alertar para reduções
            
            var matchingAlerts = await GetMatchingAlertsAsync(property, cancellationToken);
            
            foreach (var alert in matchingAlerts.Where(a => a.PriceDropAlerts))
            {
                await CreateAlertNotificationAsync(alert, property, "price_drop", oldPrice, cancellationToken);
                alert.LastTriggered = DateTime.UtcNow;
            }
            
            if (matchingAlerts.Any())
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        public async Task<AlertNotificationsResponseDto> GetUserNotificationsAsync(
            string userId,
            int limit = 20,
            CancellationToken cancellationToken = default)
        {
            var notifications = await _context.PropertyAlertNotifications
                .Include(n => n.Property)
                .Where(n => n.UserId == userId && n.IsActive)
                .OrderByDescending(n => n.CreatedAt)
                .Take(limit)
                .ToListAsync(cancellationToken);

            var unreadCount = await _context.PropertyAlertNotifications
                .Where(n => n.UserId == userId && n.IsActive && n.ReadAt == null)
                .CountAsync(cancellationToken);

            return new AlertNotificationsResponseDto
            {
                Notifications = notifications.Select(n => new PropertyAlertNotificationDto
                {
                    Id = n.Id,
                    PropertyId = n.PropertyId,
                    Title = n.Title,
                    Message = n.Message,
                    AlertType = n.AlertType,
                    CreatedAt = n.CreatedAt,
                    IsRead = n.ReadAt.HasValue,
                    PropertyTitle = n.Property.Title,
                    PropertyLocation = n.PropertyLocation,
                    PropertyPrice = n.PropertyPrice,
                    OldPrice = n.OldPrice,
                    Bedrooms = n.Property.Bedrooms,
                    PropertyType = n.Property.Type
                }).ToList(),
                TotalCount = notifications.Count,
                UnreadCount = unreadCount
            };
        }

        public async Task<AlertStatsDto> GetUserAlertStatsAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            var notifications = await _context.PropertyAlertNotifications
                .Where(n => n.UserId == userId && n.IsActive)
                .ToListAsync(cancellationToken);

            return new AlertStatsDto
            {
                TotalNotifications = notifications.Count,
                UnreadNotifications = notifications.Count(n => n.ReadAt == null),
                NewListingAlerts = notifications.Count(n => n.AlertType == "new_listing"),
                PriceDropAlerts = notifications.Count(n => n.AlertType == "price_drop"),
                LastNotification = notifications.Any() ? notifications.Max(n => n.CreatedAt) : null
            };
        }

        public async Task MarkNotificationAsReadAsync(
            string userId,
            Guid notificationId,
            CancellationToken cancellationToken = default)
        {
            var notification = await _context.PropertyAlertNotifications
                .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId, cancellationToken);

            if (notification != null && notification.ReadAt == null)
            {
                notification.ReadAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        public async Task MarkAllNotificationsAsReadAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            var unreadNotifications = await _context.PropertyAlertNotifications
                .Where(n => n.UserId == userId && n.IsActive && n.ReadAt == null)
                .ToListAsync(cancellationToken);

            foreach (var notification in unreadNotifications)
            {
                notification.ReadAt = DateTime.UtcNow;
            }

            if (unreadNotifications.Any())
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        private async Task<List<PropertyAlert>> GetMatchingAlertsAsync(Property property, CancellationToken cancellationToken)
        {
            var query = _context.PropertyAlerts.Where(a => a.IsActive);
            var propertyLocation = GetPropertyLocationString(property);
            
            if (!string.IsNullOrWhiteSpace(propertyLocation))
            {
                query = query.Where(a => a.Location == null ||
                    propertyLocation.Contains(a.Location) || a.Location.Contains(propertyLocation) ||
                    (property.City != null && a.Location.Contains(property.City)) ||
                    (property.County != null && a.Location.Contains(property.County)) ||
                    (property.State != null && a.Location.Contains(property.State)));
            }
            
            if (!string.IsNullOrWhiteSpace(property.Type))
            {
                query = query.Where(a => a.PropertyType == null || a.PropertyType == property.Type);
            }
            
            query = query.Where(a =>
                (a.MinPrice == null || property.Price >= a.MinPrice) &&
                (a.MaxPrice == null || property.Price <= a.MaxPrice) &&
                (a.Bedrooms == null || property.Bedrooms >= a.Bedrooms) &&
                (a.Bathrooms == null || property.Bathrooms >= a.Bathrooms));
                
            return await query.ToListAsync(cancellationToken);
        }

        private async Task CreateAlertNotificationAsync(
            PropertyAlert alert,
            Property property,
            string alertType,
            CancellationToken cancellationToken)
        {
            await CreateAlertNotificationAsync(alert, property, alertType, null, cancellationToken);
        }

        private async Task CreateAlertNotificationAsync(
            PropertyAlert alert,
            Property property,
            string alertType,
            decimal? oldPrice,
            CancellationToken cancellationToken)
        {
            var (title, message) = GenerateNotificationContent(alert, property, alertType, oldPrice);
            var propertyLocation = GetPropertyLocationString(property);

            // Verificar se já existe notificação recente para evitar duplicatas
            var existingNotification = await _context.PropertyAlertNotifications
                .FirstOrDefaultAsync(n => 
                    n.UserId == alert.UserId && 
                    n.PropertyId == property.Id && 
                    n.AlertType == alertType &&
                    n.CreatedAt > DateTime.UtcNow.AddHours(-1), // Últimas 1 hora
                    cancellationToken);

            if (existingNotification != null)
            {
                _logger.LogDebug("Skipping duplicate notification for user {UserId}, property {PropertyId}, type {AlertType}",
                    alert.UserId, property.Id, alertType);
                return;
            }

            var notification = new PropertyAlertNotification
            {
                UserId = alert.UserId,
                PropertyId = property.Id,
                AlertId = alert.Id,
                AlertType = alertType,
                Title = title,
                Message = message,
                PropertyPrice = property.Price,
                OldPrice = oldPrice,
                PropertyLocation = propertyLocation,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.PropertyAlertNotifications.Add(notification);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created alert notification for user {UserId}, property {PropertyId}, type {AlertType}",
                alert.UserId, property.Id, alertType);
        }

        private static (string title, string message) GenerateNotificationContent(
            PropertyAlert alert,
            Property property,
            string alertType,
            decimal? oldPrice)
        {
            var propertyDesc = $"{property.Type ?? "Propriedade"} em {property.City ?? "localização não especificada"}";
            var priceText = property.Price.HasValue ? $"€{property.Price:N0}" : "Preço sob consulta";

            return alertType switch
            {
                "new_listing" => (
                    $"?? Novo {propertyDesc}",
                    $"Encontrámos uma nova propriedade que corresponde ao seu alerta '{alert.Name}': {propertyDesc} por {priceText}."
                ),
                "price_drop" => (
                    $"?? Redução de preço - {propertyDesc}",
                    $"O preço de uma propriedade no seu alerta '{alert.Name}' foi reduzido de €{oldPrice:N0} para {priceText}. Poupança: €{(oldPrice - property.Price):N0}!"
                ),
                _ => (
                    $"?? Alerta: {propertyDesc}",
                    $"Nova atualização para o seu alerta '{alert.Name}': {propertyDesc}."
                )
            };
        }

        private static string GetPropertyLocationString(Property property)
        {
            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(property.Address)) parts.Add(property.Address);
            if (!string.IsNullOrWhiteSpace(property.CivilParish)) parts.Add(property.CivilParish);
            if (!string.IsNullOrWhiteSpace(property.City)) parts.Add(property.City);
            if (!string.IsNullOrWhiteSpace(property.County)) parts.Add(property.County);
            if (!string.IsNullOrWhiteSpace(property.State)) parts.Add(property.State);
            return parts.Any() ? string.Join(", ", parts) : "Localização não especificada";
        }
    }
}
