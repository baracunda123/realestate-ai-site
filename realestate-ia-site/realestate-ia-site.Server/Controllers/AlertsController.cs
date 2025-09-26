using Microsoft.AspNetCore.Mvc;
using realestate_ia_site.Server.Application.PropertyAlerts;
using realestate_ia_site.Server.Application.PropertyAlerts.DTOs;
using realestate_ia_site.Server.Controllers;

namespace realestate_ia_site.Server.Controllers
{
    /// <summary>
    /// Controller para gestão de alertas de redução de preço
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
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
        /// Obter todos os alertas de redução de preço do usuário
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

            _logger.LogInformation("Getting price alerts for user {UserId}", userId);

            try
            {
                var alerts = await _alertService.GetUserAlertsAsync(userId, includeInactive, HttpContext.RequestAborted);
                return Ok(alerts);
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
        /// Criar novo alerta de redução de preço
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(PropertyAlertDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<PropertyAlertDto>> CreatePriceAlert(
            [FromBody] CreatePriceAlertRequestDto request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Creating price alert for user {UserId} on property {PropertyId}", 
                userId, request.PropertyId);

            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var alert = await _alertService.CreatePriceAlertAsync(userId, request, HttpContext.RequestAborted);

                _logger.LogInformation("Price alert {AlertId} created successfully for user {UserId}", 
                    alert.Id, userId);

                return CreatedAtAction(nameof(GetAlertById), new { alertId = alert.Id }, alert);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid request for creating price alert for user {UserId}", userId);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating price alert for user {UserId}", userId);
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
            [FromBody] UpdatePriceAlertRequestDto request)
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

                return Ok(alert);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid request for updating alert {AlertId} for user {UserId}", alertId, userId);
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating alert {AlertId} for user {UserId}", alertId, userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Excluir alerta
        /// </summary>
        [HttpDelete("{alertId:guid}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
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
                var deleted = await _alertService.DeleteAlertAsync(userId, alertId, HttpContext.RequestAborted);
                
                if (!deleted)
                {
                    _logger.LogWarning("Alert {AlertId} not found for user {UserId}", alertId, userId);
                    return NotFound(new { message = "Alerta não encontrado" });
                }

                return Ok(new { message = "Alerta removido com sucesso" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting alert {AlertId} for user {UserId}", alertId, userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Excluir alerta por propriedade
        /// </summary>
        [HttpDelete("property/{propertyId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> DeleteAlertByProperty(string propertyId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Deleting alert for property {PropertyId} for user {UserId}", propertyId, userId);

            try
            {
                var deleted = await _alertService.DeleteAlertByPropertyAsync(userId, propertyId, HttpContext.RequestAborted);
                
                if (!deleted)
                {
                    return NotFound(new { message = "Alerta não encontrado para esta propriedade" });
                }

                return Ok(new { message = "Alerta removido com sucesso" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting alert for property {PropertyId} for user {UserId}", propertyId, userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Verificar se existe alerta para uma propriedade
        /// </summary>
        [HttpGet("property/{propertyId}/exists")]
        [ProducesResponseType(typeof(bool), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<bool>> HasAlertForProperty(string propertyId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            try
            {
                var hasAlert = await _alertService.HasAlertForPropertyAsync(userId, propertyId, HttpContext.RequestAborted);
                return Ok(hasAlert);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking alert for property {PropertyId} for user {UserId}", propertyId, userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Obter notificações de redução de preço do usuário
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

            try
            {
                var notifications = await _alertService.GetUserNotificationsAsync(userId, limit, HttpContext.RequestAborted);
                return Ok(notifications);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting notifications for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Marcar notificação como lida
        /// </summary>
        [HttpPost("notifications/{notificationId:guid}/mark-read")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> MarkNotificationAsRead(Guid notificationId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            try
            {
                await _alertService.MarkNotificationAsReadAsync(userId, notificationId, HttpContext.RequestAborted);
                return Ok(new { message = "Notificação marcada como lida" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking notification as read for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Marcar todas as notificações como lidas
        /// </summary>
        [HttpPost("notifications/mark-all-read")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> MarkAllNotificationsAsRead()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            try
            {
                await _alertService.MarkAllNotificationsAsReadAsync(userId, HttpContext.RequestAborted);
                return Ok(new { message = "Todas as notificações marcadas como lidas" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking all notifications as read for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }
    }
}