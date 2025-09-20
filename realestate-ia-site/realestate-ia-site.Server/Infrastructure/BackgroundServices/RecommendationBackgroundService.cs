using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Application.Recommendations;

namespace realestate_ia_site.Server.Infrastructure.BackgroundServices
{
    public class RecommendationBackgroundService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<RecommendationBackgroundService> _logger;
        private readonly TimeSpan _interval = TimeSpan.FromMinutes(5); // Executar a cada 15 min

        public RecommendationBackgroundService(
            IServiceProvider serviceProvider,
            ILogger<RecommendationBackgroundService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Recommendation Background Service started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await ProcessRecommendationsAsync(stoppingToken);
                    await Task.Delay(_interval, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    _logger.LogInformation("Recommendation Background Service is stopping");
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in Recommendation Background Service");
                    await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken); // Wait 30 minutes on error
                }
            }
        }

        private async Task ProcessRecommendationsAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var recommendationService = scope.ServiceProvider.GetRequiredService<PropertyRecommendationService>();

            _logger.LogInformation("Starting scheduled recommendation processing");

            try
            {
                // 1. Encontrar utilizadores ativos (atividade nos últimos 30 dias)
                var activeUsers = await GetActiveUsersAsync(context, cancellationToken);
                _logger.LogInformation("Found {Count} active users to process", activeUsers.Count);

                // 2. Processar recomendações para utilizadores ativos
                foreach (var userId in activeUsers)
                {
                    try
                    {
                        await recommendationService.RefreshUserRecommendationsAsync(userId, cancellationToken);
                        _logger.LogDebug("Refreshed recommendations for user {UserId}", userId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error refreshing recommendations for user {UserId}", userId);
                    }
                }

                // 3. Limpar recomendações antigas (mais de 30 dias)
                await CleanupOldRecommendationsAsync(context, cancellationToken);

                // 4. NOVO: Limpar histórico de pesquisas antigo (mais de 90 dias)
                await CleanupOldSearchHistoryAsync(context, cancellationToken);

                _logger.LogInformation("Completed scheduled recommendation processing");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during scheduled recommendation processing");
                throw;
            }
        }

        private async Task<List<string>> GetActiveUsersAsync(IApplicationDbContext context, CancellationToken cancellationToken)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-30);

            // Utilizadores com atividade recente (favoritos, pesquisas, login)
            var activeUserIds = new HashSet<string>();

            // Utilizadores com favoritos recentes
            var usersWithRecentFavorites = await context.Favorites
                .Where(f => f.CreatedAt > cutoffDate)
                .Select(f => f.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);
            
            activeUserIds.UnionWith(usersWithRecentFavorites);

            // Utilizadores com pesquisas guardadas recentes
            var usersWithRecentSearches = await context.SavedSearches
                .Where(s => s.CreatedAt > cutoffDate || s.LastExecutedAt > cutoffDate)
                .Select(s => s.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);
            
            activeUserIds.UnionWith(usersWithRecentSearches);

            // NOVO: Utilizadores com histórico de pesquisas recentes (tracking de TODAS as pesquisas)
            var usersWithRecentSearchHistory = await context.UserSearchHistories
                .Where(h => h.UserId != null && h.CreatedAt > cutoffDate)
                .Select(h => h.UserId!)
                .Distinct()
                .ToListAsync(cancellationToken);
            
            activeUserIds.UnionWith(usersWithRecentSearchHistory);

            // Utilizadores com login recente
            var usersWithRecentLogin = await context.UserLoginSessions
                .Where(s => s.LoginAt > cutoffDate)
                .Select(s => s.UserId)
                .Distinct()
                .ToListAsync(cancellationToken);
            
            activeUserIds.UnionWith(usersWithRecentLogin);

            return activeUserIds.ToList();
        }

        private async Task CleanupOldRecommendationsAsync(IApplicationDbContext context, CancellationToken cancellationToken)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-30);

            var oldRecommendations = await context.PropertyRecommendations
                .Where(r => r.CreatedAt < cutoffDate && r.ViewedAt == null)
                .ToListAsync(cancellationToken);

            if (oldRecommendations.Any())
            {
                context.PropertyRecommendations.RemoveRange(oldRecommendations);
                await context.SaveChangesAsync(cancellationToken);
                
                _logger.LogInformation("Cleaned up {Count} old recommendations", oldRecommendations.Count);
            }
        }

        private async Task CleanupOldSearchHistoryAsync(IApplicationDbContext context, CancellationToken cancellationToken)
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-90); // Manter histórico por 90 dias

            var oldSearchHistory = await context.UserSearchHistories
                .Where(h => h.CreatedAt < cutoffDate)
                .ToListAsync(cancellationToken);

            if (oldSearchHistory.Any())
            {
                context.UserSearchHistories.RemoveRange(oldSearchHistory);
                await context.SaveChangesAsync(cancellationToken);
                
                _logger.LogInformation("Cleaned up {Count} old search history entries", oldSearchHistory.Count);
            }
        }

        public override async Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("Recommendation Background Service is stopping");
            await base.StopAsync(cancellationToken);
        }
    }
}