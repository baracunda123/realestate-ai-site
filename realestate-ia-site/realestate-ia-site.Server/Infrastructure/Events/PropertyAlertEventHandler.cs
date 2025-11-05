using realestate_ia_site.Server.Application.Common.Events;
using realestate_ia_site.Server.Domain.Events;
using realestate_ia_site.Server.Application.Features.Properties.Alerts;
using realestate_ia_site.Server.Application.Features.Properties.Recommendations;

namespace realestate_ia_site.Server.Infrastructure.Events
{
    /// <summary>
    /// Event handler responsável pelo processamento de eventos de mudança de preço para alertas
    /// </summary>
    public class PropertyAlertEventHandler : 
        IDomainEventHandler<PropertyPriceChangedEvent>
    {
        private readonly PropertyAlertService _alertService;
        private readonly PropertyRecommendationService _recommendationService;
        private readonly ILogger<PropertyAlertEventHandler> _logger;

        public PropertyAlertEventHandler(
            PropertyAlertService alertService,
            PropertyRecommendationService recommendationService,
            ILogger<PropertyAlertEventHandler> logger)
        {
            _alertService = alertService;
            _recommendationService = recommendationService;
            _logger = logger;
        }

        public async Task HandleAsync(PropertyPriceChangedEvent domainEvent, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Handling PropertyPriceChangedEvent for property {PropertyId}: {OldPrice} -> {NewPrice}", 
                domainEvent.PropertyId, domainEvent.OldPrice, domainEvent.Property.Price);
            
            try
            {
                // Só processar se for redução de preço
                if (domainEvent.Property.Price < domainEvent.OldPrice)
                {
                    // Processar alertas de redução de preço
                    await _alertService.ProcessPriceChangeAsync(domainEvent.Property, domainEvent.OldPrice, cancellationToken);
                    
                    // Processar recomendações por mudança de preço
                    await _recommendationService.ProcessPriceChangeForRecommendationsAsync(
                        domainEvent.Property, domainEvent.OldPrice, cancellationToken);
                        
                    _logger.LogInformation("Price drop processed for property {PropertyId}: saved €{Savings}", 
                        domainEvent.PropertyId, domainEvent.OldPrice - domainEvent.Property.Price);
                }
                else
                {
                    _logger.LogDebug("Price increase ignored for property {PropertyId}", domainEvent.PropertyId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing price change alert for property {PropertyId}", domainEvent.PropertyId);
                throw;
            }
        }
    }
}