using realestate_ia_site.Server.Application.Features.AI.Interfaces;

namespace realestate_ia_site.Server.Infrastructure.BackgroundServices
{
    /// <summary>
    /// Serviço de background que limpa contextos de conversa expirados (inativos há mais de 3 dias)
    /// </summary>
    public class ContextCleanupService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<ContextCleanupService> _logger;
        private readonly TimeSpan _cleanupInterval = TimeSpan.FromHours(6); // Executa a cada 6 horas

        public ContextCleanupService(
            IServiceProvider serviceProvider,
            ILogger<ContextCleanupService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("ContextCleanupService iniciado - Limpeza a cada {Hours} horas", _cleanupInterval.TotalHours);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(_cleanupInterval, stoppingToken);

                    using (var scope = _serviceProvider.CreateScope())
                    {
                        var contextService = scope.ServiceProvider.GetRequiredService<IConversationContextService>();
                        
                        _logger.LogInformation("Executando limpeza de contextos expirados...");
                        contextService.ClearExpiredContexts();
                    }
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("ContextCleanupService parado");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Erro durante limpeza de contextos");
                    // Continua executando mesmo com erro
                }
            }
        }
    }
}
