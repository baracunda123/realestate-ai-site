using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Application.PropertyAlerts.DTOs;

namespace realestate_ia_site.Server.Application.PropertyAlerts
{
    /// <summary>
    /// Service responsável pela gestão de alertas de propriedades e criação de notificações
    /// </summary>
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

        #region CRUD Operations

        public async Task<AlertsResponseDto> GetUserAlertsAsync(
            string userId,
            bool includeInactive = false,
            CancellationToken cancellationToken = default)
        {
            var query = _context.PropertyAlerts.Where(a => a.UserId == userId);
            
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
                .FirstOrDefaultAsync(a => a.Id == alertId && a.UserId == userId, cancellationToken);

            return alert == null ? null : MapToDto(alert);
        }

        public async Task<PropertyAlertDto> CreateAlertAsync(
            string userId,
            CreateAlertRequestDto request,
            CancellationToken cancellationToken = default)
        {
            ValidateCreateRequest(request);

            var alert = new PropertyAlert
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Name = request.Name,
                Location = request.Location,
                PropertyType = request.PropertyType,
                MinPrice = request.MinPrice,
                MaxPrice = request.MaxPrice,
                Bedrooms = request.Bedrooms,
                Bathrooms = request.Bathrooms,
                PriceDropAlerts = request.PriceDropAlerts,
                NewListingAlerts = request.NewListingAlerts,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                MatchCount = 0,
                NewMatches = 0
            };

            _context.PropertyAlerts.Add(alert);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created alert {AlertId} for user {UserId}", alert.Id, userId);

            return MapToDto(alert);
        }

        public async Task<PropertyAlertDto?> UpdateAlertAsync(
            string userId,
            Guid alertId,
            UpdateAlertRequestDto request,
            CancellationToken cancellationToken = default)
        {
            var alert = await _context.PropertyAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId && a.UserId == userId, cancellationToken);

            if (alert == null) return null;

            // Atualizar apenas campos fornecidos
            if (!string.IsNullOrWhiteSpace(request.Name))
                alert.Name = request.Name;
            
            if (request.Location != null)
                alert.Location = request.Location;
            
            if (request.PropertyType != null)
                alert.PropertyType = request.PropertyType;
            
            if (request.MinPrice.HasValue)
                alert.MinPrice = request.MinPrice;
            
            if (request.MaxPrice.HasValue)
                alert.MaxPrice = request.MaxPrice;
            
            if (request.Bedrooms.HasValue)
                alert.Bedrooms = request.Bedrooms;
            
            if (request.Bathrooms.HasValue)
                alert.Bathrooms = request.Bathrooms;
            
            if (request.PriceDropAlerts.HasValue)
                alert.PriceDropAlerts = request.PriceDropAlerts.Value;
            
            if (request.NewListingAlerts.HasValue)
                alert.NewListingAlerts = request.NewListingAlerts.Value;
            
            if (request.IsActive.HasValue)
                alert.IsActive = request.IsActive.Value;

            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Updated alert {AlertId} for user {UserId}", alertId, userId);

            return MapToDto(alert);
        }

        public async Task<PropertyAlertDto?> ToggleAlertAsync(
            string userId,
            Guid alertId,
            bool isActive,
            CancellationToken cancellationToken = default)
        {
            var alert = await _context.PropertyAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId && a.UserId == userId, cancellationToken);

            if (alert == null) return null;

            alert.IsActive = isActive;
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("{Action} alert {AlertId} for user {UserId}", 
                isActive ? "Activated" : "Deactivated", alertId, userId);

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

            _logger.LogInformation("Deleted alert {AlertId} for user {UserId}", alertId, userId);
            return true;
        }

        public async Task<AlertTestResponseDto> TestAlertCriteriaAsync(
            string userId,
            CreateAlertRequestDto request,
            CancellationToken cancellationToken = default)
        {
            ValidateCreateRequest(request);

            var query = BuildPropertyQuery(request);
            var matchCount = await query.CountAsync(cancellationToken);
            
            var sampleMatches = await query
                .Take(5)
                .Select(p => new PropertyMatchDto
                {
                    Id = p.Id,
                    Title = p.Title,
                    Location = $"{p.City}, {p.County}",
                    Price = p.Price ?? 0,
                    Bedrooms = p.Bedrooms,
                    Bathrooms = p.Bathrooms,
                    PropertyType = p.Type,
                    ListingDate = p.CreatedAt,
                    IsNew = p.CreatedAt > DateTime.UtcNow.AddDays(-7)
                })
                .ToListAsync(cancellationToken);

            return new AlertTestResponseDto
            {
                PotentialMatches = sampleMatches,
                EstimatedMatchCount = matchCount,
                Recommendations = GenerateRecommendations(matchCount)
            };
        }

        public async Task<bool> MarkAlertAsViewedAsync(
            string userId,
            Guid alertId,
            CancellationToken cancellationToken = default)
        {
            var alert = await _context.PropertyAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId && a.UserId == userId, cancellationToken);

            if (alert == null) return false;

            alert.NewMatches = 0;
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        #endregion

        #region Notification Processing

        public async Task ProcessNewPropertyAsync(Property property, CancellationToken cancellationToken = default)
        {
            var matchingAlerts = await GetMatchingAlertsAsync(property, cancellationToken);
            
            foreach (var alert in matchingAlerts.Where(a => a.NewListingAlerts))
            {
                await CreateAlertNotificationAsync(alert, property, "new_listing", null, cancellationToken);
                alert.LastTriggered = DateTime.UtcNow;
                alert.MatchCount++;
                alert.NewMatches++;
            }
            
            if (matchingAlerts.Any())
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        public async Task ProcessPriceChangeAsync(Property property, decimal oldPrice, CancellationToken cancellationToken = default)
        {
            if (property.Price >= oldPrice) return; // Só reduções de preço
            
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

        #endregion

        #region Private Helper Methods

        private static PropertyAlertDto MapToDto(PropertyAlert alert)
        {
            return new PropertyAlertDto
            {
                Id = alert.Id,
                UserId = alert.UserId,
                Name = alert.Name,
                Location = alert.Location,
                PropertyType = alert.PropertyType,
                MinPrice = alert.MinPrice,
                MaxPrice = alert.MaxPrice,
                Bedrooms = alert.Bedrooms,
                Bathrooms = alert.Bathrooms,
                PriceDropAlerts = alert.PriceDropAlerts,
                NewListingAlerts = alert.NewListingAlerts,
                IsActive = alert.IsActive,
                CreatedAt = alert.CreatedAt,
                LastTriggered = alert.LastTriggered,
                MatchCount = alert.MatchCount,
                NewMatches = alert.NewMatches
            };
        }

        private static void ValidateCreateRequest(CreateAlertRequestDto request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new ArgumentException("Nome do alerta é obrigatório");

            if (request.MinPrice.HasValue && request.MaxPrice.HasValue && request.MinPrice > request.MaxPrice)
                throw new ArgumentException("Preço mínimo não pode ser maior que o preço máximo");
        }

        private IQueryable<Property> BuildPropertyQuery(CreateAlertRequestDto request)
        {
            var query = _context.Properties.AsQueryable();

            // Aplicar filtros de localização
            if (!string.IsNullOrWhiteSpace(request.Location))
            {
                query = query.Where(p => 
                    (p.City != null && p.City.Contains(request.Location)) ||
                    (p.County != null && p.County.Contains(request.Location)) ||
                    (p.State != null && p.State.Contains(request.Location)) ||
                    (p.Address != null && p.Address.Contains(request.Location)));
            }

            // Aplicar filtros de tipo
            if (!string.IsNullOrWhiteSpace(request.PropertyType) && request.PropertyType != "any")
            {
                query = query.Where(p => p.Type == request.PropertyType);
            }

            // Aplicar filtros de preço
            if (request.MinPrice.HasValue)
            {
                query = query.Where(p => p.Price >= request.MinPrice);
            }

            if (request.MaxPrice.HasValue)
            {
                query = query.Where(p => p.Price <= request.MaxPrice);
            }

            // Aplicar filtros de quartos
            if (request.Bedrooms.HasValue)
            {
                query = query.Where(p => p.Bedrooms >= request.Bedrooms);
            }

            // Aplicar filtros de casas de banho
            if (request.Bathrooms.HasValue)
            {
                query = query.Where(p => p.Bathrooms >= request.Bathrooms);
            }

            return query;
        }

        private static List<string> GenerateRecommendations(int matchCount)
        {
            var recommendations = new List<string>();

            if (matchCount == 0)
            {
                recommendations.Add("Considere expandir a área de pesquisa para incluir concelhos próximos");
                recommendations.Add("Tente aumentar a gama de preços");
                recommendations.Add("Considere reduzir o número mínimo de quartos ou casas de banho");
            }
            else if (matchCount < 5)
            {
                recommendations.Add("Poucas propriedades encontradas. Considere ajustar os critérios");
                recommendations.Add("Tente expandir ligeiramente a gama de preços");
            }
            else if (matchCount > 50)
            {
                recommendations.Add("Muitas propriedades encontradas. Considere refinar os critérios");
                recommendations.Add("Tente ser mais específico na localização ou tipo de propriedade");
            }

            return recommendations;
        }

        private async Task<List<PropertyAlert>> GetMatchingAlertsAsync(Property property, CancellationToken cancellationToken)
        {
            var query = _context.PropertyAlerts.Where(a => a.IsActive);
            
            // Filtro de localização
            if (!string.IsNullOrWhiteSpace(property.City) || !string.IsNullOrWhiteSpace(property.County))
            {
                query = query.Where(a => a.Location == null ||
                    (property.City != null && a.Location.Contains(property.City)) ||
                    (property.County != null && a.Location.Contains(property.County)));
            }
            
            // Filtro de tipo
            if (!string.IsNullOrWhiteSpace(property.Type))
            {
                query = query.Where(a => a.PropertyType == null || a.PropertyType == property.Type);
            }
            
            // Filtros de preço e características
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
            decimal? oldPrice = null,
            CancellationToken cancellationToken = default)
        {
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

            var (title, message) = GenerateNotificationContent(alert, property, alertType, oldPrice);
            var propertyLocation = GetPropertyLocationString(property);

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
            if (!string.IsNullOrWhiteSpace(property.City)) parts.Add(property.City);
            if (!string.IsNullOrWhiteSpace(property.County)) parts.Add(property.County);
            if (!string.IsNullOrWhiteSpace(property.State)) parts.Add(property.State);
            return parts.Any() ? string.Join(", ", parts) : "Localização não especificada";
        }

        #endregion
    }
}
