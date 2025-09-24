using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace realestate_ia_site.Server.Infrastructure.Notifications
{
    /// <summary>
    /// Hub SignalR para notificações em tempo real (alertas de redução de preço)
    /// </summary>
    [Authorize]
    public class NotificationHub : Hub
    {
        private readonly ILogger<NotificationHub> _logger;

        public NotificationHub(ILogger<NotificationHub> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Conectar utilizador ao seu grupo pessoal de notificações
        /// </summary>
        public override async Task OnConnectedAsync()
        {
            var userId = GetCurrentUserId();
            
            if (!string.IsNullOrEmpty(userId))
            {
                var userGroup = $"user_{userId}";
                await Groups.AddToGroupAsync(Context.ConnectionId, userGroup);
                
                _logger.LogInformation("User {UserId} connected to SignalR with connection {ConnectionId}", 
                    userId, Context.ConnectionId);
                
                // Notificar cliente que conexão foi estabelecida
                await Clients.Caller.SendAsync("Connected", new { 
                    userId = userId, 
                    connectionId = Context.ConnectionId,
                    timestamp = DateTime.UtcNow 
                });
            }
            else
            {
                _logger.LogWarning("Anonymous user tried to connect to SignalR with connection {ConnectionId}", 
                    Context.ConnectionId);
                
                // Desconectar utilizadores não autenticados
                Context.Abort();
                return;
            }

            await base.OnConnectedAsync();
        }

        /// <summary>
        /// Remover utilizador do grupo quando desconectar
        /// </summary>
        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = GetCurrentUserId();
            
            if (!string.IsNullOrEmpty(userId))
            {
                var userGroup = $"user_{userId}";
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, userGroup);
                
                _logger.LogInformation("User {UserId} disconnected from SignalR with connection {ConnectionId}. Exception: {Exception}", 
                    userId, Context.ConnectionId, exception?.Message);
            }

            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Método para cliente confirmar que recebeu uma notificação
        /// </summary>
        public async Task AcknowledgeNotification(string notificationId)
        {
            var userId = GetCurrentUserId();
            
            if (!string.IsNullOrEmpty(userId))
            {
                _logger.LogInformation("User {UserId} acknowledged notification {NotificationId}", 
                    userId, notificationId);
                
                // Aqui poderia marcar a notificação como entregue na BD se necessário
                await Clients.Caller.SendAsync("NotificationAcknowledged", notificationId);
            }
        }

        /// <summary>
        /// Método para cliente pedir reenvio de notificações não lidas
        /// </summary>
        public async Task RequestUnreadNotifications()
        {
            var userId = GetCurrentUserId();
            
            if (!string.IsNullOrEmpty(userId))
            {
                _logger.LogInformation("User {UserId} requested unread notifications", userId);
                
                // Sinalizar ao service que deve reenviar notificações não lidas
                // Isto será implementado no PropertyAlertService
                await Clients.Caller.SendAsync("UnreadNotificationsRequested");
            }
        }

        /// <summary>
        /// Obter ID do utilizador atual a partir dos claims
        /// </summary>
        private string? GetCurrentUserId()
        {
            return Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? Context.User?.FindFirst("sub")?.Value
                ?? Context.User?.FindFirst("id")?.Value;
        }

        /// <summary>
        /// Método para debug - mostrar informações da conexão
        /// </summary>
        public async Task GetConnectionInfo()
        {
            var userId = GetCurrentUserId();
            var connectionInfo = new
            {
                ConnectionId = Context.ConnectionId,
                UserId = userId,
                UserAgent = Context.GetHttpContext()?.Request.Headers.UserAgent.ToString(),
                RemoteIpAddress = Context.GetHttpContext()?.Connection.RemoteIpAddress?.ToString(),
                ConnectedAt = DateTime.UtcNow
            };

            await Clients.Caller.SendAsync("ConnectionInfo", connectionInfo);
            
            _logger.LogInformation("Connection info requested: {@ConnectionInfo}", connectionInfo);
        }
    }
}