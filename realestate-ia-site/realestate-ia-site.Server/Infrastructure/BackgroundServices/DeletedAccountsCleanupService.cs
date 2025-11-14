using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Infrastructure.Persistence;

namespace realestate_ia_site.Server.Infrastructure.BackgroundServices
{
    /// <summary>
    /// Serviço de background que elimina permanentemente contas marcadas para eliminação após 30 dias
    /// </summary>
    public class DeletedAccountsCleanupService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<DeletedAccountsCleanupService> _logger;
        private readonly TimeSpan _checkInterval = TimeSpan.FromHours(24); // Verificar uma vez por dia

        public DeletedAccountsCleanupService(
            IServiceProvider serviceProvider,
            ILogger<DeletedAccountsCleanupService> _logger)
        {
            _serviceProvider = serviceProvider;
            this._logger = _logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("[DeletedAccountsCleanup] Serviço iniciado");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CleanupDeletedAccountsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[DeletedAccountsCleanup] Erro ao limpar contas eliminadas");
                }

                // Aguardar 24 horas antes da próxima verificação
                await Task.Delay(_checkInterval, stoppingToken);
            }

            _logger.LogInformation("[DeletedAccountsCleanup] Serviço parado");
        }

        private async Task CleanupDeletedAccountsAsync(CancellationToken ct)
        {
            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

            var now = DateTime.UtcNow;

            // Encontrar contas marcadas para eliminação há mais de 30 dias
            var accountsToDelete = await context.Users
                .Where(u => u.IsDeleted && u.PermanentDeletionAt.HasValue && u.PermanentDeletionAt.Value <= now)
                .ToListAsync(ct);

            if (accountsToDelete.Count == 0)
            {
                _logger.LogInformation("[DeletedAccountsCleanup] Nenhuma conta para eliminar");
                return;
            }

            _logger.LogInformation("[DeletedAccountsCleanup] Encontradas {Count} contas para eliminação permanente", accountsToDelete.Count);

            foreach (var user in accountsToDelete)
            {
                try
                {
                    _logger.LogInformation("[DeletedAccountsCleanup] Eliminando permanentemente conta userId={UserId}, email={Email}, deletedAt={DeletedAt}", 
                        user.Id, user.Email, user.DeletedAt);

                    // Eliminar avatar se existir
                    if (!string.IsNullOrEmpty(user.AvatarUrl))
                    {
                        try
                        {
                            var fileStorageService = scope.ServiceProvider.GetRequiredService<Infrastructure.Storage.IFileStorageService>();
                            await fileStorageService.DeleteFileAsync(user.AvatarUrl);
                            _logger.LogInformation("[DeletedAccountsCleanup] Avatar eliminado para userId={UserId}", user.Id);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "[DeletedAccountsCleanup] Falha ao eliminar avatar userId={UserId}", user.Id);
                        }
                    }

                    // Eliminar utilizador permanentemente (cascade delete vai eliminar dados relacionados)
                    var result = await userManager.DeleteAsync(user);
                    
                    if (result.Succeeded)
                    {
                        _logger.LogInformation("[DeletedAccountsCleanup] Conta eliminada permanentemente userId={UserId}, email={Email}", 
                            user.Id, user.Email);
                    }
                    else
                    {
                        var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                        _logger.LogError("[DeletedAccountsCleanup] Falha ao eliminar conta userId={UserId}: {Errors}", 
                            user.Id, errors);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[DeletedAccountsCleanup] Erro ao processar eliminação de userId={UserId}", user.Id);
                }
            }

            _logger.LogInformation("[DeletedAccountsCleanup] Limpeza concluída. {Count} contas processadas", accountsToDelete.Count);
        }
    }
}
