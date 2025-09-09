using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Application.Common.Events;
using realestate_ia_site.Server.Domain.Events;
using realestate_ia_site.Server.Infrastructure.RealTime;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Domain.Models;

namespace realestate_ia_site.Server.Infrastructure.Events
{
    /// <summary>
    /// Event handler que processa eventos de propriedades e envia notificações em tempo real
    /// </summary>
    public class RealTimePropertyEventHandler : 
        IDomainEventHandler<PropertyCreatedEvent>,
        IDomainEventHandler<PropertyPriceChangedEvent>
    {
        private readonly ApplicationDbContext _context;
        private readonly INotificationService _notificationService;
        private readonly ILogger<RealTimePropertyEventHandler> _logger;

        public RealTimePropertyEventHandler(
            ApplicationDbContext context,
            INotificationService notificationService,
            ILogger<RealTimePropertyEventHandler> logger)
        {
            _context = context;
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task HandleAsync(PropertyCreatedEvent domainEvent, CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation("Processing PropertyCreatedEvent for property {PropertyId}", 
                    domainEvent.PropertyId);

                // Buscar alertas que correspondem à nova propriedade
                var matchingAlerts = await FindMatchingAlerts(domainEvent.Property);

                // Enviar notificações para cada usuário com alerta correspondente
                foreach (var alert in matchingAlerts)
                {
                    if (!string.IsNullOrEmpty(alert.UserId))
                    {
                        var notification = new PropertyAlertNotification
                        {
                            AlertId = alert.Id.ToString(),
                            AlertName = alert.Name,
                            PropertyId = domainEvent.Property.Id,
                            PropertyTitle = domainEvent.Property.Title ?? "Sem título",
                            PropertyPrice = domainEvent.Property.Price ?? 0,
                            PropertyLocation = FormatPropertyLocation(domainEvent.Property),
                            PropertyImageUrl = domainEvent.Property.ImageUrl ?? "",
                            Message = $"Nova propriedade encontrada para o seu alerta '{alert.Name}'",
                            Metadata = new Dictionary<string, object>
                            {
                                { "propertyType", domainEvent.Property.Type ?? "" },
                                { "bedrooms", domainEvent.Property.Bedrooms ?? 0 },
                                { "bathrooms", domainEvent.Property.Bathrooms ?? 0 },
                                { "area", domainEvent.Property.Area ?? 0 }
                            }
                        };

                        await _notificationService.SendPropertyAlertAsync(alert.UserId, notification);

                        // Atualizar contador de novos matches no alerta
                        alert.NewMatches += 1;
                        alert.LastTriggered = DateTime.UtcNow;
                    }
                }

                // Salvar alterações nos alertas
                if (matchingAlerts.Any())
                {
                    await _context.SaveChangesAsync(cancellationToken);
                }

                // Broadcast para usuários interessados em atualizações de propriedades
                var propertyUpdate = new PropertyUpdateNotification
                {
                    PropertyId = domainEvent.Property.Id,
                    UpdateType = "created",
                    PropertyTitle = domainEvent.Property.Title ?? "Sem título",
                    PropertyLocation = FormatPropertyLocation(domainEvent.Property),
                    Price = domainEvent.Property.Price,
                    Changes = new Dictionary<string, object>
                    {
                        { "isNew", true },
                        { "createdAt", domainEvent.Property.CreatedAt }
                    }
                };

                await _notificationService.BroadcastPropertyUpdateAsync(propertyUpdate);

                _logger.LogInformation("PropertyCreatedEvent processed successfully. {AlertCount} alerts notified", 
                    matchingAlerts.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing PropertyCreatedEvent for property {PropertyId}", 
                    domainEvent.PropertyId);
            }
        }

        public async Task HandleAsync(PropertyPriceChangedEvent domainEvent, CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation("Processing PropertyPriceChangedEvent for property {PropertyId}", 
                    domainEvent.PropertyId);

                // Buscar alertas que correspondem a esta propriedade
                var matchingAlerts = await FindMatchingAlerts(domainEvent.Property);

                // Enviar notificações de mudança de preço
                foreach (var alert in matchingAlerts)
                {
                    if (!string.IsNullOrEmpty(alert.UserId))
                    {
                        var priceChangeNotification = new PriceChangeNotification
                        {
                            PropertyId = domainEvent.Property.Id,
                            PropertyTitle = domainEvent.Property.Title ?? "Sem título",
                            OldPrice = domainEvent.OldPrice,
                            NewPrice = domainEvent.NewPrice,
                            PropertyImageUrl = domainEvent.Property.ImageUrl ?? "",
                            PropertyLocation = FormatPropertyLocation(domainEvent.Property)
                        };

                        await _notificationService.SendPriceChangeAsync(alert.UserId, priceChangeNotification);
                    }
                }

                // Broadcast da mudança de preço
                var propertyUpdate = new PropertyUpdateNotification
                {
                    PropertyId = domainEvent.Property.Id,
                    UpdateType = "price_changed",
                    PropertyTitle = domainEvent.Property.Title ?? "Sem título",
                    PropertyLocation = FormatPropertyLocation(domainEvent.Property),
                    Price = domainEvent.NewPrice,
                    Changes = new Dictionary<string, object>
                    {
                        { "oldPrice", domainEvent.OldPrice },
                        { "newPrice", domainEvent.NewPrice },
                        { "changeAmount", domainEvent.NewPrice - domainEvent.OldPrice },
                        { "changePercentage", domainEvent.OldPrice > 0 ? ((domainEvent.NewPrice - domainEvent.OldPrice) / domainEvent.OldPrice) * 100 : 0 }
                    }
                };

                await _notificationService.BroadcastPropertyUpdateAsync(propertyUpdate);

                _logger.LogInformation("PropertyPriceChangedEvent processed successfully. {AlertCount} alerts notified", 
                    matchingAlerts.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing PropertyPriceChangedEvent for property {PropertyId}", 
                    domainEvent.PropertyId);
            }
        }

        private async Task<List<PropertyAlert>> FindMatchingAlerts(Domain.Entities.Property property)
        {
            try
            {
                var query = _context.PropertyAlerts.Where(a => a.IsActive);

                // Filtrar por localização
                if (!string.IsNullOrEmpty(property.City) || !string.IsNullOrEmpty(property.County))
                {
                    query = query.Where(a => 
                        string.IsNullOrEmpty(a.Location) ||
                        (!string.IsNullOrEmpty(property.City) && a.Location.Contains(property.City)) ||
                        (!string.IsNullOrEmpty(property.County) && a.Location.Contains(property.County)));
                }

                // Filtrar por tipo de propriedade
                if (!string.IsNullOrEmpty(property.Type))
                {
                    query = query.Where(a => 
                        string.IsNullOrEmpty(a.PropertyType) || 
                        a.PropertyType == "any" || 
                        a.PropertyType == property.Type);
                }

                // Filtrar por preço
                if (property.Price.HasValue)
                {
                    query = query.Where(a => 
                        (!a.MinPrice.HasValue || property.Price >= a.MinPrice) &&
                        (!a.MaxPrice.HasValue || property.Price <= a.MaxPrice));
                }

                // Filtrar por quartos
                if (property.Bedrooms.HasValue)
                {
                    query = query.Where(a => 
                        !a.Bedrooms.HasValue || property.Bedrooms >= a.Bedrooms);
                }

                // Filtrar por banheiros
                if (property.Bathrooms.HasValue)
                {
                    query = query.Where(a => 
                        !a.Bathrooms.HasValue || property.Bathrooms >= a.Bathrooms);
                }

                return await query.ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error finding matching alerts for property {PropertyId}", property.Id);
                return new List<PropertyAlert>();
            }
        }

        private static string FormatPropertyLocation(Domain.Entities.Property property)
        {
            var parts = new List<string>();
            
            if (!string.IsNullOrEmpty(property.City))
                parts.Add(property.City);
            
            if (!string.IsNullOrEmpty(property.County) && property.County != property.City)
                parts.Add(property.County);
            
            if (!string.IsNullOrEmpty(property.State) && property.State != property.County && property.State != property.City)
                parts.Add(property.State);

            return parts.Any() ? string.Join(", ", parts) : "Localização não especificada";
        }
    }

    /// <summary>
    /// Service para notificações do sistema
    /// </summary>
    public interface ISystemNotificationService
    {
        Task NotifyMaintenanceAsync(DateTime scheduledTime, TimeSpan duration);
        Task NotifyFeatureUpdateAsync(string featureName, string description);
        Task NotifySubscriptionExpiryAsync(string userId, DateTime expiryDate);
        Task NotifySecurityAlertAsync(string userId, string alertType, string details);
    }

    public class SystemNotificationService : ISystemNotificationService
    {
        private readonly INotificationService _notificationService;
        private readonly ILogger<SystemNotificationService> _logger;

        public SystemNotificationService(
            INotificationService notificationService,
            ILogger<SystemNotificationService> logger)
        {
            _notificationService = notificationService;
            _logger = logger;
        }

        public async Task NotifyMaintenanceAsync(DateTime scheduledTime, TimeSpan duration)
        {
            var notification = new SystemNotification
            {
                Type = "warning",
                Title = "Manutenção Programada",
                Message = $"O sistema ficará indisponível para manutenção em {scheduledTime:dd/MM/yyyy HH:mm} por aproximadamente {duration.TotalMinutes} minutos.",
                RequiresAction = false,
                Data = new Dictionary<string, object>
                {
                    { "scheduledTime", scheduledTime },
                    { "durationMinutes", duration.TotalMinutes }
                }
            };

            // Broadcast para todos os usuários conectados
            await _notificationService.SendToGroupAsync("property_alerts", "SystemNotification", notification);
            
            _logger.LogInformation("Maintenance notification sent for {ScheduledTime}", scheduledTime);
        }

        public async Task NotifyFeatureUpdateAsync(string featureName, string description)
        {
            var notification = new SystemNotification
            {
                Type = "info",
                Title = "Nova Funcionalidade",
                Message = $"Nova funcionalidade disponível: {featureName}. {description}",
                RequiresAction = false,
                Data = new Dictionary<string, object>
                {
                    { "featureName", featureName },
                    { "description", description }
                }
            };

            await _notificationService.SendToGroupAsync("property_alerts", "SystemNotification", notification);
            
            _logger.LogInformation("Feature update notification sent for {FeatureName}", featureName);
        }

        public async Task NotifySubscriptionExpiryAsync(string userId, DateTime expiryDate)
        {
            var daysUntilExpiry = (expiryDate - DateTime.UtcNow).Days;

            var notification = new SystemNotification
            {
                Type = daysUntilExpiry <= 3 ? "error" : "warning",
                Title = "Assinatura Expirando",
                Message = $"Sua assinatura Premium expira em {daysUntilExpiry} dias ({expiryDate:dd/MM/yyyy}). Renove para continuar aproveitando todos os recursos.",
                RequiresAction = true,
                ActionUrl = "/subscription/renew",
                ActionText = "Renovar Assinatura",
                Data = new Dictionary<string, object>
                {
                    { "expiryDate", expiryDate },
                    { "daysUntilExpiry", daysUntilExpiry }
                }
            };

            await _notificationService.SendSystemNotificationAsync(userId, notification);
            
            _logger.LogInformation("Subscription expiry notification sent to user {UserId}", userId);
        }

        public async Task NotifySecurityAlertAsync(string userId, string alertType, string details)
        {
            var notification = new SystemNotification
            {
                Type = "error",
                Title = "Alerta de Segurança",
                Message = $"Detectamos atividade suspeita em sua conta: {alertType}. Verifique suas configurações de segurança.",
                RequiresAction = true,
                ActionUrl = "/security/settings",
                ActionText = "Verificar Segurança",
                Data = new Dictionary<string, object>
                {
                    { "alertType", alertType },
                    { "details", details },
                    { "timestamp", DateTime.UtcNow }
                }
            };

            await _notificationService.SendSystemNotificationAsync(userId, notification);
            
            _logger.LogInformation("Security alert notification sent to user {UserId}: {AlertType}", userId, alertType);
        }
    }
}