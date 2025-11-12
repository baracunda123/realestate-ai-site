using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Security;
using realestate_ia_site.Server.Application.Common.Interfaces;

namespace realestate_ia_site.Server.Presentation.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SessionsController : BaseController
    {
        private readonly UserManager<User> _userManager;
        private readonly SecurityAuditService _auditService;
        private readonly ILogger<SessionsController> _logger;
        private readonly IApplicationDbContext _context;

        public SessionsController(
            UserManager<User> userManager,
            SecurityAuditService auditService,
            ILogger<SessionsController> logger,
            IApplicationDbContext context)
        {
            _userManager = userManager;
            _auditService = auditService;
            _logger = logger;
            _context = context;
        }

        /// <summary>
        /// Obter sessões ativas do utilizador
        /// </summary>
        [HttpGet]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult> GetActiveSessions(CancellationToken ct = default)
        {
            try
            {
                var userId = GetCurrentUserId();

                var sessions = await _userManager.Users
                    .Where(u => u.Id == userId)
                    .SelectMany(u => u.LoginSessions)
                    .Where(s => s.ExpiresAt > DateTime.UtcNow)
                    .OrderByDescending(s => s.LastActivity)
                    .Select(s => new
                    {
                        id = s.Id,
                        deviceInfo = s.UserAgent,
                        ipAddress = s.IpAddress,
                        lastActivity = s.LastActivity,
                        isCurrentSession = false
                    })
                    .ToListAsync(ct);

                _logger.LogInformation("[Sessions] Retrieved {Count} active sessions for userId={UserId}", sessions.Count, userId);
                return Ok(sessions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Sessions] Error retrieving sessions for userId={UserId}", GetCurrentUserId());
                return StatusCode(500, new { message = "Erro ao carregar sessões" });
            }
        }

        /// <summary>
        /// Terminar todas as outras sessões (manter apenas a atual)
        /// Invalida o Refresh Token para forçar novo login em todos os dispositivos
        /// REQUER confirmação por password para segurança adicional
        /// </summary>
        [HttpPost("revoke-all")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult> RevokeAllOtherSessions([FromBody] RevokeSessionsRequest request, CancellationToken ct = default)
        {
            try
            {
                var userId = GetCurrentUserId();
                var user = await _userManager.FindByIdAsync(userId);

                if (user == null)
                {
                    return NotFound(new { success = false, message = "Utilizador não encontrado" });
                }
                
                // SEGURANÇA: Verificar password antes de terminar sessões
                if (!await _userManager.CheckPasswordAsync(user, request.Password))
                {
                    _logger.LogWarning("[Sessions] Tentativa de terminar sessões com password incorreta userId={UserId}", userId);
                    _auditService.LogSecurityEvent(SecurityEventType.SuspiciousActivity, "Failed session revocation - wrong password", 
                        new { UserId = userId });
                    return BadRequest(new { success = false, message = "Password incorreta" });
                }
                
                // Contar sessões antes de limpar
                var sessionsCount = await _context.UserLoginSessions
                    .Where(s => s.UserId == userId && s.ExpiresAt > DateTime.UtcNow)
                    .CountAsync(ct);

                _logger.LogInformation("[Sessions] Found {Count} active sessions for userId={UserId}", sessionsCount, userId);

                // Limpar TODAS as sessões da BD
                var allSessions = await _context.UserLoginSessions
                    .Where(s => s.UserId == userId)
                    .ToListAsync(ct);
                
                _context.UserLoginSessions.RemoveRange(allSessions);

                // INVALIDAR o Refresh Token - isto força novo login em TODOS os dispositivos
                var oldRefreshToken = user.RefreshToken;
                user.RefreshToken = null;
                user.RefreshTokenExpires = null;
                
                await _userManager.UpdateAsync(user);
                await _context.SaveChangesAsync(ct);

                _logger.LogWarning("[Sessions] All sessions terminated for userId={UserId}, count={Count}", userId, sessionsCount);
                _auditService.LogSecurityEvent(SecurityEventType.LogoutSuccess, "All other sessions terminated", 
                    new { UserId = userId, SessionCount = sessionsCount, OldToken = oldRefreshToken?.Substring(0, 8) });

                return Ok(new { 
                    success = true, 
                    message = "Todas as outras sessões foram terminadas. Terás que fazer login novamente nos outros dispositivos.", 
                    revokedCount = sessionsCount - 1 // -1 porque a atual vai continuar até expirar
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Sessions] Error terminating sessions userId={UserId}", GetCurrentUserId());
                return StatusCode(500, new { success = false, message = "Erro ao terminar sessões" });
            }
        }
    }
    
    public class RevokeSessionsRequest
    {
        public string Password { get; set; } = string.Empty;
    }
}
