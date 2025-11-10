namespace realestate_ia_site.Server.Application.Notifications.Interfaces
{
    /// <summary>
    /// Interface para serviço de notificações em tempo real via SignalR
    /// </summary>
    public interface IRealtimeNotificationService
    {
        /// <summary>
        /// Enviar contagem atualizada de notificações não lidas para utilizador específico
        /// </summary>
        Task SendUnreadCountUpdateAsync(string userId, int unreadCount);
        
        /// <summary>
        /// Enviar mensagem genérica para utilizador específico
        /// </summary>
        Task SendMessageToUserAsync(string userId, string message, object? data = null);
        
        /// <summary>
        /// Verificar se utilizador está conectado via SignalR
        /// </summary>
        Task<bool> IsUserConnectedAsync(string userId);
        
        /// <summary>
        /// Obter número de conexões ativas para um utilizador
        /// </summary>
        Task<int> GetUserConnectionCountAsync(string userId);
    }
}
