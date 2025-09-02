using realestate_ia_site.Server.Infrastructure.Notifications;

namespace realestate_ia_site.Server.Infrastructure.Events
{
    public class PropertyAlertEventHandler : 
        IDomainEventHandler<PropertyCreatedEvent>,
        IDomainEventHandler<PropertyPriceChangedEvent>
    {
        private readonly PropertyAlertService _alertService;
        private readonly ILogger<PropertyAlertEventHandler> _logger;

        public PropertyAlertEventHandler(
            PropertyAlertService alertService,
            ILogger<PropertyAlertEventHandler> logger)
        {
            _alertService = alertService;
            _logger = logger;
        }

        public async Task HandleAsync(PropertyCreatedEvent domainEvent, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Handling PropertyCreatedEvent for property {PropertyId}", domainEvent.PropertyId);
            
            try
            {
                await _alertService.ProcessNewPropertyAsync(domainEvent.Property, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing new property alert for {PropertyId}", domainEvent.PropertyId);
                throw;
            }
        }

        public async Task HandleAsync(PropertyPriceChangedEvent domainEvent, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Handling PropertyPriceChangedEvent for property {PropertyId}", domainEvent.PropertyId);
            
            try
            {
                await _alertService.ProcessPriceChangeAsync(domainEvent.Property, domainEvent.OldPrice, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing price change alert for {PropertyId}", domainEvent.PropertyId);
                throw;
            }
        }
    }
}