using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models;
using realestate_ia_site.Server.DTOs;

namespace realestate_ia_site.Server.Infrastructure.Notifications
{
    public class PropertyAlertService
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ISmsService _smsService;
        private readonly ILogger<PropertyAlertService> _logger;

        public PropertyAlertService(
            ApplicationDbContext context,
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
            var query = _context.PropertyAlerts
                .Where(a => a.IsActive);

            // Criar uma representação de localização da propriedade
            var propertyLocation = GetPropertyLocationString(property);

            // Filtrar por critérios de localização
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
            var user = await _context.Users.FindAsync(alert.UserId);
            if (user == null) return;

            var propertyLocation = GetPropertyLocationString(property);

            // Apenas notificações por email por enquanto
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

            // SMS desabilitado até a propriedade Phone ser adicionada à classe User
            if (alert.SmsNotifications)
            {
                _logger.LogWarning("SMS notifications solicitadas mas a propriedade Phone não está disponível na classe User. UserId: {UserId}", alert.UserId);
            }
        }

        private async Task SendPriceDropNotificationAsync(PropertyAlert alert, Property property, decimal oldPrice, CancellationToken cancellationToken)
        {
            var user = await _context.Users.FindAsync(alert.UserId);
            if (user == null) return;

            if (!property.Price.HasValue) return; // Não processar se não há preço atual

            var savings = oldPrice - property.Price.Value;

            // Apenas notificações por email por enquanto
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

            // SMS desabilitado até a propriedade Phone ser adicionada à classe User
            if (alert.SmsNotifications)
            {
                _logger.LogWarning("SMS notifications solicitadas mas a propriedade Phone não está disponível na classe User. UserId: {UserId}", alert.UserId);
            }
        }

        // Método helper para criar uma string de localização baseada nas propriedades disponíveis
        private static string GetPropertyLocationString(Property property)
        {
            var locationParts = new List<string>();

            if (!string.IsNullOrWhiteSpace(property.Address))
                locationParts.Add(property.Address);
            if (!string.IsNullOrWhiteSpace(property.CivilParish))
                locationParts.Add(property.CivilParish);
            if (!string.IsNullOrWhiteSpace(property.City))
                locationParts.Add(property.City);
            if (!string.IsNullOrWhiteSpace(property.County))
                locationParts.Add(property.County);
            if (!string.IsNullOrWhiteSpace(property.State))
                locationParts.Add(property.State);

            return locationParts.Any() ? string.Join(", ", locationParts) : "Localização não especificada";
        }
    }
}