using System.Reflection;
using realestate_ia_site.Server.Application.Common.Events;
using realestate_ia_site.Server.Domain.Events;

namespace realestate_ia_site.Server.Infrastructure.Events
{
    public class DomainEventDispatcher : IDomainEventDispatcher
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<DomainEventDispatcher> _logger;

        public DomainEventDispatcher(IServiceProvider serviceProvider, ILogger<DomainEventDispatcher> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        public async Task PublishAsync<TEvent>(TEvent domainEvent, CancellationToken cancellationToken = default) where TEvent : IDomainEvent
        {
            _logger.LogInformation("Publishing domain event: {EventType} with ID: {EventId}", 
                typeof(TEvent).Name, domainEvent.Id);

            using var scope = _serviceProvider.CreateScope();
            var handlerType = typeof(IDomainEventHandler<>).MakeGenericType(typeof(TEvent));
            var handlers = scope.ServiceProvider.GetServices(handlerType);
            var tasks = new List<Task>();

            foreach (var handler in handlers)
            {
                var method = handlerType.GetMethod("HandleAsync");
                if (method != null)
                {
                    var task = (Task)method.Invoke(handler, new object[] { domainEvent, cancellationToken })!;
                    tasks.Add(task);
                }
            }

            try
            {
                await Task.WhenAll(tasks);
                _logger.LogInformation("Successfully processed {HandlerCount} handlers for event {EventType}", 
                    tasks.Count, typeof(TEvent).Name);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing handlers for event {EventType}", typeof(TEvent).Name);
                throw;
            }
        }
    }
}