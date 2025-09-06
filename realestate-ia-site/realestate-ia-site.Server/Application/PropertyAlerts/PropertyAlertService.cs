using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models; // adicionar para PropertyAlert
using realestate_ia_site.Server.Application.Notifications.Interfaces;
using realestate_ia_site.Server.Application.Common.Interfaces;

namespace realestate_ia_site.Server.Application.PropertyAlerts
{
    // Application Service responsável por coordenar regras de alertas e disparar notificações
    public class PropertyAlertService
    {
        private readonly IApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ISmsService _smsService;
        private readonly ILogger<PropertyAlertService> _logger;

        public PropertyAlertService(
            IApplicationDbContext context,
            IEmailService emailService,
            ISmsService smsService,
            ILogger<PropertyAlertService> logger)
        {
            _context = context;
            _emailService = emailService;
            _smsService = smsService;
            _logger = logger;
        }

        public async Task ProcessNewPropertyAsync(Property property, CancellationToken cancellationToken = default)
        {
            var matchingAlerts = await GetMatchingAlertsAsync(property, cancellationToken);
            foreach (var alert in matchingAlerts)
            {
                if (alert.NewListingAlerts)
                {
                    await SendNewPropertyNotificationAsync(alert, property, cancellationToken);
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
                await SendPriceDropNotificationAsync(alert, property, oldPrice, cancellationToken);
                alert.LastTriggered = DateTime.UtcNow;
            }
            if (matchingAlerts.Any())
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

        private async Task SendNewPropertyNotificationAsync(PropertyAlert alert, Property property, CancellationToken cancellationToken)
        {
            var user = await _context.Users.FindAsync(new object?[] { alert.UserId }, cancellationToken);
            if (user == null) return;
            var propertyLocation = GetPropertyLocationString(property);
            if (alert.EmailNotifications && !string.IsNullOrWhiteSpace(user.Email))
            {
                await _emailService.SendTemplateEmailAsync("property-alert", user.Email, new
                {
                    PropertyTitle = property.Title ?? "Propriedade sem título",
                    Location = propertyLocation,
                    Price = property.Price.HasValue ? $"€{property.Price:N0}" : "Preço sob consulta",
                    Bedrooms = property.Bedrooms?.ToString() ?? "N/A",
                    PropertyUrl = $"https://seusite.com/property/{property.Id}"
                }, cancellationToken);
                _logger.LogInformation("Email de nova propriedade enviado para utilizador {UserId}", alert.UserId);
            }
            if (alert.SmsNotifications)
            {
                _logger.LogWarning("SMS notifications solicitadas mas a propriedade Phone não está disponível na classe User. UserId: {UserId}", alert.UserId);
            }
        }

        private async Task SendPriceDropNotificationAsync(PropertyAlert alert, Property property, decimal oldPrice, CancellationToken cancellationToken)
        {
            var user = await _context.Users.FindAsync(new object?[] { alert.UserId }, cancellationToken);
            if (user == null) return;
            if (!property.Price.HasValue) return;
            var savings = oldPrice - property.Price.Value;
            if (alert.EmailNotifications && !string.IsNullOrWhiteSpace(user.Email))
            {
                await _emailService.SendTemplateEmailAsync("price-drop", user.Email, new
                {
                    PropertyTitle = property.Title ?? "Propriedade sem título",
                    OldPrice = $"€{oldPrice:N0}",
                    NewPrice = $"€{property.Price:N0}",
                    Savings = $"€{savings:N0}",
                    PropertyUrl = $"https://seusite.com/property/{property.Id}"
                }, cancellationToken);
                _logger.LogInformation("Email de redução de preço enviado para utilizador {UserId}", alert.UserId);
            }
            if (alert.SmsNotifications)
            {
                _logger.LogWarning("SMS notifications solicitadas mas a propriedade Phone não está disponível na classe User. UserId: {UserId}", alert.UserId);
            }
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
