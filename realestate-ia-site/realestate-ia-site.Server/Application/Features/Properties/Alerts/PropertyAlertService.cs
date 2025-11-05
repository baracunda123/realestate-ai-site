using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Application.Features.Properties.Alerts.DTOs;
using realestate_ia_site.Server.Application.Notifications.Interfaces;

namespace realestate_ia_site.Server.Application.Features.Properties.Alerts
{
    /// <summary>
    /// Service responsável pela gestão de alertas de redução de preço
    /// </summary>
    public class PropertyAlertService
    {
        private readonly IApplicationDbContext _context;
        private readonly IRealtimeNotificationService _realtimeNotificationService;
        private readonly ILogger<PropertyAlertService> _logger;

        public PropertyAlertService(
            IApplicationDbContext context,
            IRealtimeNotificationService realtimeNotificationService,
            ILogger<PropertyAlertService> logger)
        {
            _context = context;
            _realtimeNotificationService = realtimeNotificationService;
            _logger = logger;
        }

        #region CRUD Operations

        public async Task<AlertsResponseDto> GetUserAlertsAsync(
            string userId,
            bool includeInactive = false,
            CancellationToken cancellationToken = default)
        {
            var query = _context.PropertyAlerts
                .Include(a => a.Property)
                .Where(a => a.UserId == userId);
            
            if (!includeInactive)
            {
                query = query.Where(a => a.IsActive);
            }

            var alerts = await query
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync(cancellationToken);

            return new AlertsResponseDto
            {
                Alerts = alerts.Select(MapToDto).ToList(),
                TotalCount = alerts.Count,
                ActiveCount = alerts.Count(a => a.IsActive)
            };
        }

        public async Task<PropertyAlertDto?> GetAlertByIdAsync(
            string userId,
            Guid alertId,
            CancellationToken cancellationToken = default)
        {
            var alert = await _context.PropertyAlerts
                .Include(a => a.Property)
                .FirstOrDefaultAsync(a => a.Id == alertId && a.UserId == userId, cancellationToken);

            return alert == null ? null : MapToDto(alert);
        }

        public async Task<PropertyAlertDto> CreatePriceAlertAsync(
            string userId,
            CreatePriceAlertRequestDto request,
            CancellationToken cancellationToken = default)
        {
            // Verificar se a propriedade existe
            var property = await _context.Properties
                .FirstOrDefaultAsync(p => p.Id == request.PropertyId, cancellationToken);

            if (property == null)
                throw new ArgumentException("Propriedade não encontrada");

            if (!property.Price.HasValue)
                throw new ArgumentException("Propriedade não tem preço definido");

            // Verificar se já existe alerta para esta propriedade
            var existingAlert = await _context.PropertyAlerts
                .FirstOrDefaultAsync(a => a.UserId == userId && a.PropertyId == request.PropertyId, cancellationToken);

            if (existingAlert != null)
                throw new ArgumentException("Já existe um alerta para esta propriedade");

            var alert = new PropertyAlert
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                PropertyId = request.PropertyId,
                PropertyTitle = property.Title ?? "Propriedade sem título",
                PropertyLocation = GetPropertyLocationString(property),
                CurrentPrice = property.Price.Value,
                AlertThresholdPercentage = request.AlertThresholdPercentage,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                NotificationCount = 0
            };

            _context.PropertyAlerts.Add(alert);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created price alert {AlertId} for user {UserId} on property {PropertyId}", 
                alert.Id, userId, request.PropertyId);

            // SIGNALR: Notificar utilizador em tempo real que o alerta foi criado
            try
            {
                var alertDto = MapToDto(alert);
                await _realtimeNotificationService.SendAlertCreatedNotificationAsync(userId, alertDto);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send real-time alert created notification to user {UserId}", userId);
                // Não falhar a operação por causa do SignalR
            }

            return MapToDto(alert);
        }

        public async Task<PropertyAlertDto?> UpdateAlertAsync(
            string userId,
            Guid alertId,
            UpdatePriceAlertRequestDto request,
            CancellationToken cancellationToken = default)
        {
            var alert = await _context.PropertyAlerts
                .Include(a => a.Property)
                .FirstOrDefaultAsync(a => a.Id == alertId && a.UserId == userId, cancellationToken);

            if (alert == null) return null;

            if (request.AlertThresholdPercentage.HasValue)
                alert.AlertThresholdPercentage = request.AlertThresholdPercentage.Value;
            
            if (request.IsActive.HasValue)
                alert.IsActive = request.IsActive.Value;

            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Updated price alert {AlertId} for user {UserId}", alertId, userId);

            return MapToDto(alert);
        }

        public async Task<bool> DeleteAlertAsync(
            string userId,
            Guid alertId,
            CancellationToken cancellationToken = default)
        {
            var alert = await _context.PropertyAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId && a.UserId == userId, cancellationToken);

            if (alert == null) return false;

            _context.PropertyAlerts.Remove(alert);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Deleted price alert {AlertId} for user {UserId}", alertId, userId);
            return true;
        }

        public async Task<bool> DeleteAlertByPropertyAsync(
            string userId,
            string propertyId,
            CancellationToken cancellationToken = default)
        {
            var alert = await _context.PropertyAlerts
                .FirstOrDefaultAsync(a => a.UserId == userId && a.PropertyId == propertyId, cancellationToken);

            if (alert == null) return false;

            _context.PropertyAlerts.Remove(alert);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Deleted price alert for user {UserId} on property {PropertyId}", userId, propertyId);
            return true;
        }

        public async Task<bool> HasAlertForPropertyAsync(
            string userId,
            string propertyId,
            CancellationToken cancellationToken = default)
        {
            return await _context.PropertyAlerts
                .AnyAsync(a => a.UserId == userId && a.PropertyId == propertyId && a.IsActive, cancellationToken);
        }

        #endregion

        #region Price Change Processing

        public async Task ProcessPriceChangeAsync(
            Property property, 
            decimal oldPrice, 
            CancellationToken cancellationToken = default)
        {
            if (!property.Price.HasValue || property.Price >= oldPrice) 
                return; // Só processar reduções de preço

            var matchingAlerts = await _context.PropertyAlerts
                .Where(a => a.PropertyId == property.Id && a.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var alert in matchingAlerts)
            {
                var priceReduction = oldPrice - property.Price.Value;
                var reductionPercentage = (priceReduction / oldPrice) * 100;

                if (reductionPercentage >= alert.AlertThresholdPercentage)
                {
                    var notification = await CreatePriceDropNotificationAsync(alert, property, oldPrice, cancellationToken);
                    
                    alert.LastTriggered = DateTime.UtcNow;
                    alert.NotificationCount++;
                    alert.CurrentPrice = property.Price.Value; // Atualizar preço atual

                    // SIGNALR: Enviar notificação em tempo real
                    if (notification != null)
                    {
                        try
                        {
                            await _realtimeNotificationService.SendPriceAlertNotificationAsync(alert.UserId, notification);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to send real-time price alert to user {UserId}", alert.UserId);
                            // Continuar com o processamento mesmo se o SignalR falhar
                        }
                    }
                }
            }

            if (matchingAlerts.Any())
            {
                await _context.SaveChangesAsync(cancellationToken);

                // SIGNALR: Atualizar contagem de notificações não lidas para cada utilizador afetado
                var affectedUsers = matchingAlerts.Select(a => a.UserId).Distinct();
                foreach (var userId in affectedUsers)
                {
                    try
                    {
                        var unreadCount = await GetUnreadNotificationCountAsync(userId, cancellationToken);
                        await _realtimeNotificationService.SendUnreadCountUpdateAsync(userId, unreadCount);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to send unread count update to user {UserId}", userId);
                    }
                }
            }
        }

        #endregion

        #region Notifications

        public async Task<AlertNotificationsResponseDto> GetUserNotificationsAsync(
            string userId,
            int limit = 20,
            CancellationToken cancellationToken = default)
        {
            var notifications = await _context.PropertyAlertNotifications
                .Where(n => n.UserId == userId && n.IsActive)
                .OrderByDescending(n => n.CreatedAt)
                .Take(limit)
                .ToListAsync(cancellationToken);

            var unreadCount = await GetUnreadNotificationCountAsync(userId, cancellationToken);

            return new AlertNotificationsResponseDto
            {
                Notifications = notifications.Select(n => new PropertyAlertNotificationDto
                {
                    Id = n.Id,
                    PropertyId = n.PropertyId,
                    PropertyTitle = n.PropertyLocation ?? "Propriedade",
                    PropertyLocation = n.PropertyLocation ?? "",
                    CurrentPrice = n.PropertyPrice ?? 0,
                    OldPrice = n.OldPrice ?? 0,
                    SavingsAmount = (n.OldPrice ?? 0) - (n.PropertyPrice ?? 0),
                    SavingsPercentage = n.OldPrice > 0 ? ((n.OldPrice - n.PropertyPrice) / n.OldPrice * 100) ?? 0 : 0,
                    CreatedAt = n.CreatedAt,
                    IsRead = n.ReadAt.HasValue
                }).ToList(),
                TotalCount = notifications.Count,
                UnreadCount = unreadCount
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

                // SIGNALR: Atualizar contagem de não lidas
                try
                {
                    var unreadCount = await GetUnreadNotificationCountAsync(userId, cancellationToken);
                    await _realtimeNotificationService.SendUnreadCountUpdateAsync(userId, unreadCount);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send unread count update to user {UserId}", userId);
                }
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

                // SIGNALR: Atualizar contagem para 0
                try
                {
                    await _realtimeNotificationService.SendUnreadCountUpdateAsync(userId, 0);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to send unread count update to user {UserId}", userId);
                }
            }
        }

        private async Task<int> GetUnreadNotificationCountAsync(string userId, CancellationToken cancellationToken = default)
        {
            return await _context.PropertyAlertNotifications
                .Where(n => n.UserId == userId && n.IsActive && n.ReadAt == null)
                .CountAsync(cancellationToken);
        }

        #endregion

        #region Private Helper Methods

        private static PropertyAlertDto MapToDto(PropertyAlert alert)
        {
            return new PropertyAlertDto
            {
                Id = alert.Id,
                UserId = alert.UserId,
                PropertyId = alert.PropertyId,
                PropertyTitle = alert.PropertyTitle,
                PropertyLocation = alert.PropertyLocation,
                CurrentPrice = alert.CurrentPrice,
                AlertThresholdPercentage = alert.AlertThresholdPercentage,
                IsActive = alert.IsActive,
                CreatedAt = alert.CreatedAt,
                LastTriggered = alert.LastTriggered,
                NotificationCount = alert.NotificationCount
            };
        }

        private static string GetPropertyLocationString(Property property)
        {
            var parts = new List<string>();
            if (!string.IsNullOrWhiteSpace(property.City)) parts.Add(property.City);
            if (!string.IsNullOrWhiteSpace(property.County)) parts.Add(property.County);
            if (!string.IsNullOrWhiteSpace(property.State)) parts.Add(property.State);
            return parts.Any() ? string.Join(", ", parts) : "Localização não especificada";
        }

        private async Task<PropertyAlertNotificationDto?> CreatePriceDropNotificationAsync(
            PropertyAlert alert,
            Property property,
            decimal oldPrice,
            CancellationToken cancellationToken = default)
        {
            // Verificar se já existe notificação recente para evitar spam
            var existingNotification = await _context.PropertyAlertNotifications
                .FirstOrDefaultAsync(n => 
                    n.UserId == alert.UserId && 
                    n.PropertyId == property.Id && 
                    n.AlertType == "price_drop" &&
                    n.CreatedAt > DateTime.UtcNow.AddHours(-24), // Últimas 24 horas
                    cancellationToken);

            if (existingNotification != null)
            {
                _logger.LogDebug("Skipping duplicate price drop notification for user {UserId}, property {PropertyId}",
                    alert.UserId, property.Id);
                return null;
            }

            var savings = oldPrice - property.Price!.Value;
            var savingsPercentage = (savings / oldPrice) * 100;

            var notification = new PropertyAlertNotification
            {
                UserId = alert.UserId,
                PropertyId = property.Id,
                AlertId = alert.Id,
                AlertType = "price_drop",
                Title = $"?? Redução de Preço - {property.Title}",
                Message = $"O preço baixou de €{oldPrice:N0} para €{property.Price:N0}. Poupança: €{savings:N0} ({savingsPercentage:F1}%)",
                PropertyPrice = property.Price,
                OldPrice = oldPrice,
                PropertyLocation = alert.PropertyLocation,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.PropertyAlertNotifications.Add(notification);

            _logger.LogInformation("Created price drop notification for user {UserId}, property {PropertyId}, savings €{Savings}",
                alert.UserId, property.Id, savings);

            // Retornar DTO para envio via SignalR
            return new PropertyAlertNotificationDto
            {
                Id = notification.Id,
                PropertyId = property.Id,
                PropertyTitle = property.Title ?? "Propriedade",
                PropertyLocation = alert.PropertyLocation,
                CurrentPrice = property.Price.Value,
                OldPrice = oldPrice,
                SavingsAmount = savings,
                SavingsPercentage = savingsPercentage,
                CreatedAt = notification.CreatedAt,
                IsRead = false
            };
        }

        #endregion
    }
}
