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
        /// Obter todos os alertas do utilizador
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(AlertsResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<AlertsResponseDto>> GetUserAlerts(
            [FromQuery] bool includeInactive = false)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Getting alerts for user {UserId} (includeInactive: {IncludeInactive})", 
                userId, includeInactive);

            try
            {
                var response = await _alertService.GetUserAlertsAsync(userId, includeInactive, HttpContext.RequestAborted);

                _logger.LogInformation("Found {Count} alerts for user {UserId}", 
                    response.Alerts.Count, userId);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting alerts for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Obter detalhes de um alerta específico
        /// </summary>
        [HttpGet("{alertId:guid}")]
        [ProducesResponseType(typeof(PropertyAlertDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<PropertyAlertDto>> GetAlertById(Guid alertId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Getting alert {AlertId} for user {UserId}", alertId, userId);

            try
            {
                var alert = await _alertService.GetAlertByIdAsync(userId, alertId, HttpContext.RequestAborted);
                
                if (alert == null)
                {
                    _logger.LogWarning("Alert {AlertId} not found for user {UserId}", alertId, userId);
                    return NotFound(new { message = "Alerta não encontrado" });
                }

                return Ok(alert);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting alert {AlertId} for user {UserId}", alertId, userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Criar novo alerta
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(PropertyAlertDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<PropertyAlertDto>> CreateAlert(
            [FromBody] CreateAlertRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Creating alert '{AlertName}' for user {UserId}", request.Name, userId);

            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var alert = await _alertService.CreateAlertAsync(userId, request, HttpContext.RequestAborted);

                _logger.LogInformation("Alert {AlertId} created successfully for user {UserId}", alert.Id, userId);

                return CreatedAtAction(nameof(GetAlertById), new { alertId = alert.Id }, alert);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid request for creating alert for user {UserId}", userId);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating alert for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Atualizar alerta existente
        /// </summary>
        [HttpPut("{alertId:guid}")]
        [ProducesResponseType(typeof(PropertyAlertDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<PropertyAlertDto>> UpdateAlert(
            Guid alertId,
            [FromBody] UpdateAlertRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Updating alert {AlertId} for user {UserId}", alertId, userId);

            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var alert = await _alertService.UpdateAlertAsync(userId, alertId, request, HttpContext.RequestAborted);
                
                if (alert == null)
                {
                    _logger.LogWarning("Alert {AlertId} not found for user {UserId}", alertId, userId);
                    return NotFound(new { message = "Alerta não encontrado" });
                }

                _logger.LogInformation("Alert {AlertId} updated successfully", alertId);

                return Ok(alert);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid request for updating alert {AlertId}", alertId);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating alert {AlertId} for user {UserId}", alertId, userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Ativar/desativar alerta
        /// </summary>
        [HttpPatch("{alertId:guid}/toggle")]
        [ProducesResponseType(typeof(PropertyAlertDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<PropertyAlertDto>> ToggleAlert(
            Guid alertId,
            [FromBody] ToggleAlertRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("{Action} alert {AlertId} for user {UserId}", 
                request.IsActive ? "Activating" : "Deactivating", alertId, userId);

            try
            {
                var alert = await _alertService.ToggleAlertAsync(userId, alertId, request.IsActive, HttpContext.RequestAborted);
                
                if (alert == null)
                {
                    _logger.LogWarning("Alert {AlertId} not found for user {UserId}", alertId, userId);
                    return NotFound(new { message = "Alerta não encontrado" });
                }

                _logger.LogInformation("Alert {AlertId} {Action} successfully", alertId, 
                    request.IsActive ? "activated" : "deactivated");

                return Ok(alert);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error toggling alert {AlertId} for user {UserId}", alertId, userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Excluir alerta
        /// </summary>
        [HttpDelete("{alertId:guid}")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> DeleteAlert(Guid alertId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Deleting alert {AlertId} for user {UserId}", alertId, userId);

            try
            {
                var success = await _alertService.DeleteAlertAsync(userId, alertId, HttpContext.RequestAborted);
                
                if (!success)
                {
                    _logger.LogWarning("Alert {AlertId} not found for user {UserId}", alertId, userId);
                    return NotFound(new { message = "Alerta não encontrado" });
                }

                _logger.LogInformation("Alert {AlertId} deleted successfully", alertId);

                return Ok(new { success = true, message = "Alerta excluído com sucesso" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting alert {AlertId} for user {UserId}", alertId, userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Testar critérios de alerta
        /// </summary>
        [HttpPost("test")]
        [ProducesResponseType(typeof(AlertTestResponseDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<AlertTestResponseDto>> TestAlert(
            [FromBody] CreateAlertRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Testing alert criteria '{AlertName}' for user {UserId}", request.Name, userId);

            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var testResult = await _alertService.TestAlertCriteriaAsync(userId, request, HttpContext.RequestAborted);

                _logger.LogInformation("Alert test completed: {EstimatedCount} potential matches", 
                    testResult.EstimatedMatchCount);

                return Ok(testResult);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid request for testing alert for user {UserId}", userId);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error testing alert for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Marcar alerta como visualizado
        /// </summary>
        [HttpPost("{alertId:guid}/mark-viewed")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> MarkAlertAsViewed(Guid alertId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Marking alert {AlertId} as viewed for user {UserId}", alertId, userId);

            try
            {
                var success = await _alertService.MarkAlertAsViewedAsync(userId, alertId, HttpContext.RequestAborted);
                
                if (!success)
                {
                    _logger.LogWarning("Alert {AlertId} not found for user {UserId}", alertId, userId);
                    return NotFound(new { message = "Alerta não encontrado" });
                }

                _logger.LogInformation("Alert {AlertId} marked as viewed successfully", alertId);

                return Ok(new { success = true, message = "Alerta marcado como visualizado" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking alert as viewed for alert {AlertId}", alertId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
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