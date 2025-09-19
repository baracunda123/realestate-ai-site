using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using realestate_ia_site.Server.Application.PropertyAlerts;
using realestate_ia_site.Server.Application.PropertyAlerts.DTOs;
using realestate_ia_site.Server.Controllers;

namespace realestate_ia_site.Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("ApiPolicy")]
    [Authorize]
    public class AlertsController : BaseController
    {
        private readonly PropertyAlertService _alertService;
        private readonly ILogger<AlertsController> _logger;

        public AlertsController(
            PropertyAlertService alertService,
            ILogger<AlertsController> logger)
        {
            _alertService = alertService;
            _logger = logger;
        }

        /// <summary>
        /// Obter notificações de alertas para o utilizador
        /// </summary>
        [HttpGet("notifications")]
        [ProducesResponseType(typeof(AlertNotificationsResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<AlertNotificationsResponseDto>> GetNotifications(
            [FromQuery] int limit = 20)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Getting alert notifications for user {UserId}", userId);

            try
            {
                var notifications = await _alertService.GetUserNotificationsAsync(userId, limit, HttpContext.RequestAborted);

                _logger.LogInformation("Found {Count} notifications for user {UserId}", 
                    notifications.Notifications.Count, userId);

                return Ok(notifications);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting alert notifications for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Obter estatísticas dos alertas do utilizador
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(AlertStatsDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<AlertStatsDto>> GetAlertStats()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Getting alert stats for user {UserId}", userId);

            try
            {
                var stats = await _alertService.GetUserAlertStatsAsync(userId, HttpContext.RequestAborted);

                return Ok(stats);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting alert stats for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Marcar notificação como lida
        /// </summary>
        [HttpPost("notifications/{notificationId}/mark-read")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> MarkNotificationAsRead(Guid notificationId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Marking notification {NotificationId} as read for user {UserId}", 
                notificationId, userId);

            try
            {
                await _alertService.MarkNotificationAsReadAsync(userId, notificationId, HttpContext.RequestAborted);

                _logger.LogInformation("Notification marked as read successfully");

                return Ok(new { success = true, message = "Notificação marcada como lida" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification as read");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Marcar todas as notificações como lidas
        /// </summary>
        [HttpPost("notifications/mark-all-read")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> MarkAllNotificationsAsRead()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Marking all notifications as read for user {UserId}", userId);

            try
            {
                await _alertService.MarkAllNotificationsAsReadAsync(userId, HttpContext.RequestAborted);

                _logger.LogInformation("All notifications marked as read successfully");

                return Ok(new { success = true, message = "Todas as notificações marcadas como lidas" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking all notifications as read");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }
    }
}