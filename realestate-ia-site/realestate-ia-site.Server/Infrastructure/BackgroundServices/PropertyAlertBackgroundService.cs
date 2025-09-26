using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Application.PropertyAlerts;

namespace realestate_ia_site.Server.Infrastructure.BackgroundServices
{
    /// <summary>
    /// Background service responsável pelo processamento de alertas de redução de preço
    /// </summary>
    public class PropertyAlertBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<PropertyAlertBackgroundService> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromHours(1); // Verificar a cada hora

        public PropertyAlertBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<PropertyAlertBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Price Alert Background Service iniciado");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessPriceAlertsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Erro no processamento de alertas de preço");
                }

                await Task.Delay(_interval, stoppingToken);
            }

            _logger.LogInformation("Price Alert Background Service parado");
        }

        private async Task ProcessPriceAlertsAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var alertService = scope.ServiceProvider.GetRequiredService<PropertyAlertService>();

            _logger.LogInformation("Iniciando processamento de alertas de redução de preço");

            try
            {
                // Buscar propriedades que tiveram alterações de preço nas últimas 24 horas
                var recentPriceChanges = await context.PropertyPriceHistories
                    .Include(h => h.Property)
                    .Where(h => h.ChangedAt > DateTime.UtcNow.AddHours(-24))
                    .Where(h => h.NewPrice < h.OldPrice) // Apenas reduções
                    .OrderByDescending(h => h.ChangedAt)
                    .ToListAsync(cancellationToken);

                _logger.LogInformation("Encontradas {Count} reduções de preço nas últimas 24 horas", recentPriceChanges.Count);

                foreach (var priceChange in recentPriceChanges)
                {
                    try
                    {
                        await alertService.ProcessPriceChangeAsync(
                            priceChange.Property, 
                            priceChange.OldPrice, 
                            cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Erro ao processar mudança de preço para propriedade {PropertyId}", priceChange.PropertyId);
                    }
                }

                // Limpeza: remover alertas para propriedades que já não existem
                await CleanupOrphanedAlertsAsync(context, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro geral no processamento de alertas");
            }
        }

        private async Task CleanupOrphanedAlertsAsync(
            IApplicationDbContext context,
            CancellationToken cancellationToken)
        {
            try
            {
                // Encontrar alertas órfãos (propriedades que já não existem)
                var orphanedAlerts = await context.PropertyAlerts
                    .Where(a => !context.Properties.Any(p => p.Id == a.PropertyId))
                    .ToListAsync(cancellationToken);

                if (orphanedAlerts.Any())
                {
                    _logger.LogInformation("Removendo {Count} alertas órfãos", orphanedAlerts.Count);
                    
                    context.PropertyAlerts.RemoveRange(orphanedAlerts);
                    await context.SaveChangesAsync(cancellationToken);
                }

                // Desativar alertas muito antigos sem atividade (6 meses)
                var staleAlerts = await context.PropertyAlerts
                    .Where(a => a.IsActive)
                    .Where(a => a.CreatedAt < DateTime.UtcNow.AddMonths(-6))
                    .Where(a => a.LastTriggered == null || a.LastTriggered < DateTime.UtcNow.AddMonths(-3))
                    .ToListAsync(cancellationToken);

                if (staleAlerts.Any())
                {
                    _logger.LogInformation("Desativando {Count} alertas antigos sem atividade", staleAlerts.Count);
                    
                    foreach (var alert in staleAlerts)
                    {
                        alert.IsActive = false;
                    }
                    
                    await context.SaveChangesAsync(cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro na limpeza de alertas órfãos");
            }
        }
    }
}