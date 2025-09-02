using System.Reflection;

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

        public async Task PublishAsync<T>(T domainEvent, CancellationToken cancellationToken = default) where T : IDomainEvent
        {
            _logger.LogInformation("Publishing domain event: {EventType} with ID: {EventId}", 
                typeof(T).Name, domainEvent.Id);

            using var scope = _serviceProvider.CreateScope();
            
            // Encontrar todos os handlers para este tipo de evento
            var handlerType = typeof(IDomainEventHandler<>).MakeGenericType(typeof(T));
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
                    tasks.Count, typeof(T).Name);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing handlers for event {EventType}", typeof(T).Name);
                throw;
            }
        }
    }
}