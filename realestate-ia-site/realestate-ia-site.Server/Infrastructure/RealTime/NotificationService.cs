using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using realestate_ia_site.Server.Application.Security;

namespace realestate_ia_site.Server.Infrastructure.RealTime
{
    /// <summary>
    /// Hub para notificações em tempo real
    /// </summary>
    [Authorize]
    public class NotificationHub : Hub
    {
        private readonly ILogger<NotificationHub> _logger;
        private readonly SecurityAuditService _auditService;

        public NotificationHub(ILogger<NotificationHub> logger, SecurityAuditService auditService)
        {
            _logger = logger;
            _auditService = auditService;
        }

        public override async Task OnConnectedAsync()
        {
            var userId = Context.User?.FindFirst("user_id")?.Value;
            var connectionId = Context.ConnectionId;

            if (!string.IsNullOrEmpty(userId))
            {
                // Adicionar usuário ao grupo pessoal
                await Groups.AddToGroupAsync(connectionId, $"user_{userId}");
                
                // Log da conexão
                _logger.LogInformation("User {UserId} connected to SignalR with connection {ConnectionId}", 
                    userId, connectionId);
                
                _auditService.LogSecurityEvent(SecurityEventType.LoginSuccess, 
                    "SignalR connection established", new { UserId = userId, ConnectionId = connectionId });
            }
            else
            {
                _logger.LogWarning("Anonymous user attempted to connect to SignalR");
                Context.Abort();
                return;
            }

            await base.OnConnectedAsync();
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            var userId = Context.User?.FindFirst("user_id")?.Value;
            var connectionId = Context.ConnectionId;

            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.RemoveFromGroupAsync(connectionId, $"user_{userId}");
                
                _logger.LogInformation("User {UserId} disconnected from SignalR", userId);
            }

            if (exception != null)
            {
                _logger.LogError(exception, "SignalR disconnection error for user {UserId}", userId);
            }

            await base.OnDisconnectedAsync(exception);
        }

        /// <summary>
        /// Juntar-se a grupo de alertas de propriedades
        /// </summary>
        public async Task JoinPropertyAlertsGroup()
        {
            var userId = Context.User?.FindFirst("user_id")?.Value;
            
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, "property_alerts");
                _logger.LogDebug("User {UserId} joined property alerts group", userId);
            }
        }

        /// <summary>
        /// Sair do grupo de alertas de propriedades
        /// </summary>
        public async Task LeavePropertyAlertsGroup()
        {
            var userId = Context.User?.FindFirst("user_id")?.Value;
            
            if (!string.IsNullOrEmpty(userId))
            {
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, "property_alerts");
                _logger.LogDebug("User {UserId} left property alerts group", userId);
            }
        }

        /// <summary>
        /// Ping para manter conexão ativa
        /// </summary>
        public async Task Ping()
        {
            await Clients.Caller.SendAsync("Pong", DateTime.UtcNow);
        }
    }

    /// <summary>
    /// Serviço para enviar notificações em tempo real
    /// </summary>
    public interface INotificationService
    {
        Task SendPropertyAlertAsync(string userId, PropertyAlertNotification notification);
        Task SendPriceChangeAsync(string userId, PriceChangeNotification notification);
        Task SendSystemNotificationAsync(string userId, SystemNotification notification);
        Task BroadcastPropertyUpdateAsync(PropertyUpdateNotification notification);
        Task SendToGroupAsync(string groupName, string method, object data);
    }

    public class SignalRNotificationService : INotificationService
    {
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ILogger<SignalRNotificationService> _logger;

        public SignalRNotificationService(
            IHubContext<NotificationHub> hubContext,
            ILogger<SignalRNotificationService> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task SendPropertyAlertAsync(string userId, PropertyAlertNotification notification)
        {
            try
            {
                await _hubContext.Clients.Group($"user_{userId}")
                    .SendAsync("PropertyAlert", notification);

                _logger.LogDebug("Property alert sent to user {UserId}: {AlertName}", 
                    userId, notification.AlertName);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending property alert to user {UserId}", userId);
            }
        }

        public async Task SendPriceChangeAsync(string userId, PriceChangeNotification notification)
        {
            try
            {
                await _hubContext.Clients.Group($"user_{userId}")
                    .SendAsync("PriceChange", notification);

                _logger.LogDebug("Price change notification sent to user {UserId}: {PropertyTitle}", 
                    userId, notification.PropertyTitle);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending price change notification to user {UserId}", userId);
            }
        }

        public async Task SendSystemNotificationAsync(string userId, SystemNotification notification)
        {
            try
            {
                await _hubContext.Clients.Group($"user_{userId}")
                    .SendAsync("SystemNotification", notification);

                _logger.LogDebug("System notification sent to user {UserId}: {Type}", 
                    userId, notification.Type);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending system notification to user {UserId}", userId);
            }
        }

        public async Task BroadcastPropertyUpdateAsync(PropertyUpdateNotification notification)
        {
            try
            {
                await _hubContext.Clients.Group("property_alerts")
                    .SendAsync("PropertyUpdate", notification);

                _logger.LogDebug("Property update broadcasted: {PropertyId}", notification.PropertyId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error broadcasting property update for {PropertyId}", 
                    notification.PropertyId);
            }
        }

        public async Task SendToGroupAsync(string groupName, string method, object data)
        {
            try
            {
                await _hubContext.Clients.Group(groupName).SendAsync(method, data);
                _logger.LogDebug("Message sent to group {GroupName} via method {Method}", groupName, method);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending message to group {GroupName}", groupName);
            }
        }
    }

    // DTOs para notificações
    public class PropertyAlertNotification
    {
        public string AlertId { get; set; } = string.Empty;
        public string AlertName { get; set; } = string.Empty;
        public string PropertyId { get; set; } = string.Empty;
        public string PropertyTitle { get; set; } = string.Empty;
        public decimal PropertyPrice { get; set; }
        public string PropertyLocation { get; set; } = string.Empty;
        public string PropertyImageUrl { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string Message { get; set; } = string.Empty;
        public Dictionary<string, object> Metadata { get; set; } = new();
    }

    public class PriceChangeNotification
    {
        public string PropertyId { get; set; } = string.Empty;
        public string PropertyTitle { get; set; } = string.Empty;
        public decimal OldPrice { get; set; }
        public decimal NewPrice { get; set; }
        public decimal ChangeAmount => NewPrice - OldPrice;
        public decimal ChangePercentage => OldPrice > 0 ? (ChangeAmount / OldPrice) * 100 : 0;
        public string ChangeType => ChangeAmount > 0 ? "increase" : "decrease";
        public DateTime ChangedAt { get; set; } = DateTime.UtcNow;
        public string PropertyImageUrl { get; set; } = string.Empty;
        public string PropertyLocation { get; set; } = string.Empty;
    }

    public class SystemNotification
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Type { get; set; } = string.Empty; // "info", "warning", "error", "success"
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool RequiresAction { get; set; } = false;
        public string? ActionUrl { get; set; }
        public string? ActionText { get; set; }
        public Dictionary<string, object> Data { get; set; } = new();
    }

    public class PropertyUpdateNotification
    {
        public string PropertyId { get; set; } = string.Empty;
        public string UpdateType { get; set; } = string.Empty; // "created", "updated", "deleted", "price_changed"
        public string PropertyTitle { get; set; } = string.Empty;
        public string PropertyLocation { get; set; } = string.Empty;
        public decimal? Price { get; set; }
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public Dictionary<string, object> Changes { get; set; } = new();
    }

    /// <summary>
    /// Extensions para configurar SignalR
    /// </summary>
    public static class SignalRExtensions
    {
        public static IServiceCollection AddSignalRNotifications(this IServiceCollection services)
        {
            services.AddSignalR(options =>
            {
                options.EnableDetailedErrors = false; // Disable in production
                options.KeepAliveInterval = TimeSpan.FromSeconds(15);
                options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
                options.HandshakeTimeout = TimeSpan.FromSeconds(15);
                options.MaximumReceiveMessageSize = 32 * 1024; // 32KB
            });

            services.AddScoped<INotificationService, SignalRNotificationService>();

            return services;
        }

        public static WebApplication MapSignalRHubs(this WebApplication app)
        {
            app.MapHub<NotificationHub>("/notificationHub", options =>
            {
                options.Transports = Microsoft.AspNetCore.Http.Connections.HttpTransportType.WebSockets | 
                                   Microsoft.AspNetCore.Http.Connections.HttpTransportType.LongPolling;
            });

            return app;
        }
    }
}