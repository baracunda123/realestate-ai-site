using realestate_ia_site.Server.Application.Services;

namespace realestate_ia_site.Server.Infrastructure.BackgroundServices
{
    /// <summary>
    /// Background service que roda periodicamente para eliminar anúncios arquivados há muito tempo
    /// </summary>
    public class PropertyCleanupBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<PropertyCleanupBackgroundService> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromDays(1); // Roda diariamente
        private readonly int _daysAfterArchive = 90; // Elimina após 90 dias arquivado

        public PropertyCleanupBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<PropertyCleanupBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Property Cleanup Background Service started");

            // Aguardar 1 minuto antes de começar (para dar tempo do app inicializar)
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("Starting property cleanup job");

                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var trackingService = scope.ServiceProvider
                            .GetRequiredService<IPropertyTrackingService>();

                        var deletedCount = await trackingService.DeleteExpiredPropertiesAsync(_daysAfterArchive);

                        if (deletedCount > 0)
                        {
                            _logger.LogInformation(
                                "Property cleanup completed: {Count} expired properties deleted",
                                deletedCount);
                        }
                        else
                        {
                            _logger.LogInformation("Property cleanup completed: No expired properties to delete");
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during property cleanup job");
                }

                // Aguardar até o próximo run
                _logger.LogInformation("Next property cleanup scheduled in {Hours} hours", _interval.TotalHours);
                await Task.Delay(_interval, stoppingToken);
            }

            _logger.LogInformation("Property Cleanup Background Service stopped");
        }
    }
}
