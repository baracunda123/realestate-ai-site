using Microsoft.AspNetCore.SignalR;
using realestate_ia_site.Server.Application.Notifications.Interfaces;
using realestate_ia_site.Server.Application.Features.Properties.Alerts.DTOs;

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
        /// Enviar notificação de novo alerta de redução de preço
        /// </summary>
        public async Task SendPriceAlertNotificationAsync(string userId, PropertyAlertNotificationDto notification)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Attempted to send price alert notification to null/empty userId");
                return;
            }

            var userGroup = $"user_{userId}";
            
            try
            {
                _logger.LogInformation("Sending price alert notification to user {UserId}: Property {PropertyTitle}, Savings: {SavingsAmount}€", 
                    userId, notification.PropertyTitle, notification.SavingsAmount);

                var notificationData = new
                {
                    Type = "price_alert",
                    Notification = notification,
                    Timestamp = DateTime.UtcNow,
                    Message = $"?? Redução de preço! {notification.PropertyTitle} baixou {notification.SavingsPercentage:F1}% (€{notification.SavingsAmount:N0})"
                };

                await _hubContext.Clients.Group(userGroup).SendAsync("NewPriceAlert", notificationData);
                
                _logger.LogInformation("Price alert notification sent successfully to user {UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending price alert notification to user {UserId}", userId);
            }
        }

        /// <summary>
        /// Enviar notificação de novo alerta criado
        /// </summary>
        public async Task SendAlertCreatedNotificationAsync(string userId, PropertyAlertDto alert)
        {
            if (string.IsNullOrEmpty(userId))
            {
                _logger.LogWarning("Attempted to send alert created notification to null/empty userId");
                return;
            }

            var userGroup = $"user_{userId}";
            
            try
            {
                _logger.LogInformation("Sending alert created notification to user {UserId}: Property {PropertyTitle}", 
                    userId, alert.PropertyTitle);

                var notificationData = new
                {
                    Type = "alert_created",
                    Alert = alert,
                    Timestamp = DateTime.UtcNow,
                    Message = $"?? Alerta criado! Será notificado de reduções de {alert.AlertThresholdPercentage}% ou mais em {alert.PropertyTitle}"
                };

                await _hubContext.Clients.Group(userGroup).SendAsync("AlertCreated", notificationData);
                
                _logger.LogInformation("Alert created notification sent successfully to user {UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending alert created notification to user {UserId}", userId);
            }
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
                _logger.LogDebug("Sending unread count update to user {UserId}: {UnreadCount} unread notifications", 
                    userId, unreadCount);

                var updateData = new
                {
                    Type = "unread_count_update",
                    UnreadCount = unreadCount,
                    Timestamp = DateTime.UtcNow
                };

                await _hubContext.Clients.Group(userGroup).SendAsync("UnreadCountUpdate", updateData);
                
                _logger.LogDebug("Unread count update sent successfully to user {UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending unread count update to user {UserId}", userId);
            }
        }

        /// <summary>
        /// Enviar mensagem genérica
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
                _logger.LogInformation("Sending generic message to user {UserId}: {Message}", userId, message);

                var messageData = new
                {
                    Type = "generic_message",
                    Message = message,
                    Data = data,
                    Timestamp = DateTime.UtcNow
                };

                await _hubContext.Clients.Group(userGroup).SendAsync("Message", messageData);
                
                _logger.LogInformation("Generic message sent successfully to user {UserId}", userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message to user {UserId}", userId);
            }
        }

        /// <summary>
        /// Verificar se utilizador está conectado (aproximação baseada em grupos)
        /// </summary>
        public async Task<bool> IsUserConnectedAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
                return false;

            try
            {
                // SignalR não tem método nativo para verificar se um grupo tem conexões ativas
                // Como workaround, tentamos enviar uma mensagem de ping e verificamos se há erro
                var userGroup = $"user_{userId}";
                
                await _hubContext.Clients.Group(userGroup).SendAsync("Ping", new { 
                    Timestamp = DateTime.UtcNow 
                });
                
                // Se chegou aqui, assumimos que há pelo menos uma conexão ativa
                return true;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Obter contagem aproximada de conexões (não implementado com precisão pelo SignalR core)
        /// </summary>
        public async Task<int> GetUserConnectionCountAsync(string userId)
        {
            if (string.IsNullOrEmpty(userId))
                return 0;

            try
            {
                // SignalR Core não fornece método direto para contar conexões num grupo
                // Para implementação precisa seria necessário manter tracking manual das conexões
                _logger.LogDebug("Connection count requested for user {UserId} (not precisely implemented)", userId);
                
                // Por agora retornamos se está conectado (1) ou não (0)
                var isConnected = await IsUserConnectedAsync(userId);
                return isConnected ? 1 : 0;
            }
            catch
            {
                return 0;
            }
        }
    }
}