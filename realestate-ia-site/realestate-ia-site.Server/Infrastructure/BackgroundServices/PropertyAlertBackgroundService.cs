using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Application.PropertyAlerts;

namespace realestate_ia_site.Server.Infrastructure.BackgroundServices
{
    /// <summary>
    /// Background service que processa alertas de propriedades automaticamente
    /// Verifica propriedades novas/atualizadas e cria notificações quando há matches com alertas ativos
    /// </summary>
    public class PropertyAlertBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<PropertyAlertBackgroundService> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromMinutes(30); // Executar a cada 30 minutos

        public PropertyAlertBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<PropertyAlertBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Property Alert Background Service started - checking every {Minutes} minutes", 
                _interval.TotalMinutes);

            // Aguardar 2 minutos antes da primeira execução para permitir que a aplicação inicialize
            await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessPropertyAlertsAsync(stoppingToken);
                    await Task.Delay(_interval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Property Alert Background Service is stopping");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in Property Alert Background Service");
                    await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken); // Wait 5 minutes on error
                }
            }
        }

        private async Task ProcessPropertyAlertsAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var alertService = scope.ServiceProvider.GetRequiredService<PropertyAlertService>();

            _logger.LogInformation("Starting scheduled property alert processing");

            try
            {
                // 1. Encontrar propriedades recentes (últimas 24 horas) que podem ter matches
                var recentProperties = await GetRecentPropertiesAsync(context, cancellationToken);
                _logger.LogInformation("Found {Count} recent properties to check against alerts", recentProperties.Count);

                var notificationsCreated = 0;
                var alertsTriggered = 0;

                // 2. Processar cada propriedade contra todos os alertas ativos
                foreach (var property in recentProperties)
                {
                    try
                    {
                        var beforeCount = await GetNotificationCountAsync(context, cancellationToken);
                        
                        // Processar nova propriedade
                        await alertService.ProcessNewPropertyAsync(property, cancellationToken);
                        
                        var afterCount = await GetNotificationCountAsync(context, cancellationToken);
                        var newNotifications = afterCount - beforeCount;
                        
                        if (newNotifications > 0)
                        {
                            notificationsCreated += newNotifications;
                            alertsTriggered++;
                            _logger.LogDebug("Property {PropertyId} triggered {Count} notifications", 
                                property.Id, newNotifications);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing property {PropertyId} for alerts", property.Id);
                    }
                }

                // 3. Processar mudanças de preço (últimas 48 horas)
                await ProcessPriceChangesAsync(context, alertService, cancellationToken);

                // 4. Verificar alertas "frios" (sem matches há muito tempo)
                await ProcessColdAlertsAsync(context, alertService, cancellationToken);

                // 5. Limpar notificações antigas (mais de 60 dias)
                await CleanupOldNotificationsAsync(context, cancellationToken);

                _logger.LogInformation("Completed property alert processing: {NotificationCount} notifications created, {AlertCount} alerts triggered", 
                    notificationsCreated, alertsTriggered);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during scheduled property alert processing");
                throw;
            }
        }

        private async Task<List<Domain.Entities.Property>> GetRecentPropertiesAsync(
            IApplicationDbContext context, 
            CancellationToken cancellationToken)
        {
            var cutoffDate = DateTime.UtcNow.AddHours(-24); // Últimas 24 horas

            // Buscar propriedades criadas/atualizadas recentemente
            var recentProperties = await context.Properties
                .Where(p => p.CreatedAt > cutoffDate || p.UpdatedAt > cutoffDate)
                .Where(p => p.Price.HasValue) // Só propriedades com preço
                .OrderBy(p => p.CreatedAt)
                .Take(200) // Limite de 200 propriedades por execução
                .ToListAsync(cancellationToken);

            return recentProperties;
        }

        private async Task<int> GetNotificationCountAsync(
            IApplicationDbContext context,
            CancellationToken cancellationToken)
        {
            return await context.PropertyAlertNotifications
                .Where(n => n.IsActive)
                .CountAsync(cancellationToken);
        }

        private async Task ProcessPriceChangesAsync(
            IApplicationDbContext context,
            PropertyAlertService alertService,
            CancellationToken cancellationToken)
        {
            var cutoffDate = DateTime.UtcNow.AddHours(-48); // Últimas 48 horas

            // Buscar propriedades com mudanças de preço recentes
            var priceChanges = await context.PropertyPriceHistories
                .Include(h => h.Property)
                .Where(h => h.ChangedAt > cutoffDate)
                .Where(h => h.NewPrice < h.OldPrice) // Só reduções de preço
                .Where(h => h.Property != null)
                .OrderByDescending(h => h.ChangedAt)
                .Take(50) // Limite de 50 mudanças por execução
                .ToListAsync(cancellationToken);

            _logger.LogInformation("Found {Count} recent price reductions to process", priceChanges.Count);

            foreach (var priceChange in priceChanges)
            {
                try
                {
                    if (priceChange.Property != null)
                    {
                        await alertService.ProcessPriceChangeAsync(
                            priceChange.Property, 
                            priceChange.OldPrice, 
                            cancellationToken);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing price change for property {PropertyId}", 
                        priceChange.PropertyId);
                }
            }
        }

        private async Task ProcessColdAlertsAsync(
            IApplicationDbContext context,
            PropertyAlertService alertService,
            CancellationToken cancellationToken)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-14); // Alertas sem matches há 14 dias

            // Encontrar alertas ativos que não têm matches há muito tempo
            var coldAlerts = await context.PropertyAlerts
                .Where(a => a.IsActive)
                .Where(a => a.LastTriggered == null || a.LastTriggered < cutoffDate)
                .Where(a => a.MatchCount < 10) // Apenas alertas com poucos matches
                .OrderBy(a => a.LastTriggered ?? a.CreatedAt)
                .Take(10) // Limite para não sobrecarregar
                .ToListAsync(cancellationToken);

            _logger.LogInformation("Found {Count} cold alerts to reprocess", coldAlerts.Count);

            foreach (var alert in coldAlerts)
            {
                try
                {
                    // Buscar propriedades existentes que possam corresponder ao alerta
                    var matchingProperties = await FindPropertiesForAlertAsync(context, alert, cancellationToken);
                    
                    var processedCount = 0;
                    foreach (var property in matchingProperties.Take(5)) // Máximo 5 matches por alerta frio
                    {
                        await alertService.ProcessNewPropertyAsync(property, cancellationToken);
                        processedCount++;
                    }

                    // Atualizar LastTriggered mesmo que não tenha encontrado matches
                    alert.LastTriggered = DateTime.UtcNow;
                    await context.SaveChangesAsync(cancellationToken);

                    _logger.LogDebug("Reprocessed cold alert {AlertId}, found {Count} potential matches", 
                        alert.Id, matchingProperties.Count);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing cold alert {AlertId}", alert.Id);
                }
            }
        }

        private async Task<List<Domain.Entities.Property>> FindPropertiesForAlertAsync(
            IApplicationDbContext context,
            Domain.Models.PropertyAlert alert,
            CancellationToken cancellationToken)
        {
            var query = context.Properties.Where(p => p.Price.HasValue);

            // Aplicar filtros do alerta
            if (!string.IsNullOrWhiteSpace(alert.Location))
            {
                query = query.Where(p => 
                    (p.City != null && p.City.Contains(alert.Location)) ||
                    (p.County != null && p.County.Contains(alert.Location)) ||
                    (p.State != null && p.State.Contains(alert.Location)) ||
                    (p.Address != null && p.Address.Contains(alert.Location)));
            }

            if (!string.IsNullOrWhiteSpace(alert.PropertyType) && alert.PropertyType != "any")
            {
                query = query.Where(p => p.Type == alert.PropertyType);
            }

            if (alert.MinPrice.HasValue)
            {
                query = query.Where(p => p.Price >= alert.MinPrice);
            }

            if (alert.MaxPrice.HasValue)
            {
                query = query.Where(p => p.Price <= alert.MaxPrice);
            }

            if (alert.Bedrooms.HasValue)
            {
                query = query.Where(p => p.Bedrooms >= alert.Bedrooms);
            }

            if (alert.Bathrooms.HasValue)
            {
                query = query.Where(p => p.Bathrooms >= alert.Bathrooms);
            }

            // Excluir propriedades para as quais já foram criadas notificações
            query = query.Where(p => !context.PropertyAlertNotifications
                .Any(n => n.PropertyId == p.Id && n.UserId == alert.UserId && n.AlertId == alert.Id && n.IsActive));

            return await query
                .OrderByDescending(p => p.CreatedAt)
                .Take(20)
                .ToListAsync(cancellationToken);
        }

        private async Task CleanupOldNotificationsAsync(
            IApplicationDbContext context, 
            CancellationToken cancellationToken)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-60); // Manter notificações por 60 dias

            var oldNotifications = await context.PropertyAlertNotifications
                .Where(n => n.CreatedAt < cutoffDate)
                .ToListAsync(cancellationToken);

            if (oldNotifications.Any())
            {
                context.PropertyAlertNotifications.RemoveRange(oldNotifications);
                await context.SaveChangesAsync(cancellationToken);
                
                _logger.LogInformation("Cleaned up {Count} old alert notifications", oldNotifications.Count);
            }

            // Limpar também histórico de preços muito antigo (mais de 1 ano)
            var oldPriceHistories = await context.PropertyPriceHistories
                .Where(h => h.ChangedAt < DateTime.UtcNow.AddDays(-365))
                .ToListAsync(cancellationToken);

            if (oldPriceHistories.Any())
            {
                context.PropertyPriceHistories.RemoveRange(oldPriceHistories);
                await context.SaveChangesAsync(cancellationToken);
                
                _logger.LogInformation("Cleaned up {Count} old price history entries", oldPriceHistories.Count);
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Property Alert Background Service is stopping");
            await base.StopAsync(cancellationToken);
        }
    }
}