using Microsoft.AspNetCore.SignalR;
using realestate_ia_site.Server.Application.Notifications.Interfaces;

namespace realestate_ia_site.Server.Infrastructure.Notifications
{
    /// <summary>
    /// Implementação do serviço de notificações em tempo real via SignalR
    /// </summary>
    public class RealtimeNotificationService : IRealtimeNotificationService
    {
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ILogger<RealtimeNotificationService> _logger;

        public RealtimeNotificationService(
            IHubContext<NotificationHub> hubContext,
            ILogger<RealtimeNotificationService> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        /// <summary>
        /// Enviar contagem atualizada de notificações não lidas
        /// </summary>
        public async Task SendUnreadCountUpdateAsync(string userId, int unreadCount)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Attempted to send unread count update to null/empty userId");
                return;
            }

            var userGroup = $"user_{userId}";
            
            try
            {
                _logger.LogInformation("Sending unread count update to user {UserId}: {UnreadCount}", userId, unreadCount);

                var notificationData = new
                {
                    Type = "unread_count",
                    UnreadCount = unreadCount,
                    Timestamp = DateTime.UtcNow
                };

                await _hubContext.Clients.Group(userGroup).SendAsync("UnreadCountUpdate", notificationData);
                
                _logger.LogInformation("Unread count update sent successfully to user {UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending unread count update to user {UserId}", userId);
            }
        }

        /// <summary>
        /// Enviar mensagem genérica para utilizador específico
        /// </summary>
        public async Task SendMessageToUserAsync(string userId, string message, object? data = null)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Attempted to send message to null/empty userId");
                return;
            }

            var userGroup = $"user_{userId}";
            
            try
            {
                _logger.LogInformation("Sending message to user {UserId}: {Message}", userId, message);

                var messageData = new
                {
                    Message = message,
                    Data = data,
                    Timestamp = DateTime.UtcNow
                };

                await _hubContext.Clients.Group(userGroup).SendAsync("ReceiveMessage", messageData);
                
                _logger.LogInformation("Message sent successfully to user {UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message to user {UserId}", userId);
            }
        }

        /// <summary>
        /// Verificar se utilizador está conectado via SignalR
        /// </summary>
        public async Task<bool> IsUserConnectedAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return false;
            }

            try
            {
                var userGroup = $"user_{userId}";
                // SignalR não tem método direto para verificar se grupo tem membros
                // Esta é uma implementação simplificada
                return await Task.FromResult(true); // Assume conectado por padrão
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if user {UserId} is connected", userId);
                return false;
            }
        }

        /// <summary>
        /// Obter número de conexões ativas para um utilizador
        /// </summary>
        public async Task<int> GetUserConnectionCountAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
            {
                return 0;
            }

            try
            {
                // SignalR não tem método direto para contar conexões de um grupo
                // Esta é uma implementação simplificada
                return await Task.FromResult(1); // Retorna 1 por padrão
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting connection count for user {UserId}", userId);
                return 0;
            }
        }
    }
}
