using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.ComponentModel.DataAnnotations;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models;
using realestate_ia_site.Server.Application.Auth;
using realestate_ia_site.Server.Application.Security;

namespace realestate_ia_site.Server.Controllers
{
    public class ForgotPasswordRequest
    {
        [Required(ErrorMessage = "Email é obrigatório")]
        [EmailAddress(ErrorMessage = "Email inválido")]
        public string Email { get; set; } = string.Empty;
    }

    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("AuthPolicy")]
    public class AuthController : BaseController
    {
        private readonly UserManager<User> _userManager;
        private readonly AuthService _authService;
        private readonly SecurityAuditService _auditService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            UserManager<User> userManager,
            AuthService authService,
            SecurityAuditService auditService,
            IConfiguration configuration,
            ILogger<AuthController> logger)
        {
            _userManager = userManager;
            _authService = authService;
            _auditService = auditService;
            _configuration = configuration;
            _logger = logger;
        }

        private void SetRefreshCookie(TokenResponse tokens)
        {
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = tokens.ExpiresAt.AddDays(29),
                Path = "/api/auth"
            };

            Response.Cookies.Append("refresh_token", tokens.RefreshToken, cookieOptions);
        }

        private static TokenResponse MaskRefresh(TokenResponse t) => new()
        {
            AccessToken = t.AccessToken,
            RefreshToken = string.Empty,
            ExpiresAt = t.ExpiresAt,
            TokenType = t.TokenType
        };

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    _auditService.LogSuspiciousActivity("Invalid registration data", $"Email: {request.Email}");
                    return BadRequest(ModelState);
                }

                if (!request.AcceptTerms)
                {
                    _auditService.LogSuspiciousActivity("Registration without accepting terms", $"Email: {request.Email}");
                    return BadRequest(new { message = "Deve aceitar os termos de uso" });
                }

                var (result, tokens) = await _authService.RegisterAsync(request);
                
                if (!result.Success)
                {
                    _auditService.LogFailedLogin(request.Email, string.Join(", ", result.Errors ?? new[] { "Unknown error" }));
                    return BadRequest(result);
                }

                if (tokens != null)
                {
                    SetRefreshCookie(tokens);
                    _auditService.LogSuccessfulLogin(result.User!.Id, result.User.Email);
                }

                return Ok(AuthResult.SuccessResult(tokens != null ? MaskRefresh(tokens) : new TokenResponse(), result.User!, result.Message ?? string.Empty));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration for email: {Email}", request.Email);
                _auditService.LogSuspiciousActivity("Registration exception", $"Email: {request.Email}, Error: {ex.Message}");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    _auditService.LogFailedLogin(request.Email, "Invalid model state");
                    return BadRequest(ModelState);
                }

                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                var (result, tokens) = await _authService.LoginAsync(request, ip);
                
                if (!result.Success)
                {
                    _auditService.LogFailedLogin(request.Email, string.Join(", ", result.Errors ?? new[] { "Authentication failed" }));
                    return BadRequest(result);
                }

                if (tokens != null)
                {
                    SetRefreshCookie(tokens);
                    _auditService.LogSuccessfulLogin(result.User!.Id, result.User.Email);
                }

                return Ok(AuthResult.SuccessResult(tokens != null ? MaskRefresh(tokens) : new TokenResponse(), result.User!, result.Message ?? string.Empty));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login for email: {Email}", request.Email);
                _auditService.LogSuspiciousActivity("Login exception", $"Email: {request.Email}, Error: {ex.Message}");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken()
        {
            try
            {
                var refreshToken = Request.Cookies["refresh_token"];
                
                if (string.IsNullOrEmpty(refreshToken))
                {
                    _auditService.LogInvalidTokenAccess("refresh", "Missing refresh token cookie");
                    return BadRequest(new { message = "Token de atualização não encontrado" });
                }

                var (tokens, result) = await _authService.RefreshAsync(refreshToken);
                
                if (!result.Success || tokens == null)
                {
                    _auditService.LogInvalidTokenAccess("refresh", result.Message ?? "Refresh failed");
                    Response.Cookies.Delete("refresh_token");
                    return BadRequest(result);
                }

                SetRefreshCookie(tokens);
                
                // Log successful refresh
                var userId = GetCurrentUserId();
                if (!string.IsNullOrEmpty(userId))
                {
                    _auditService.LogSecurityEvent(SecurityEventType.TokenRefresh, "Token refreshed successfully", new { UserId = userId });
                }

                return Ok(new { message = result.Message, token = MaskRefresh(tokens) });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during token refresh");
                _auditService.LogInvalidTokenAccess("refresh", $"Exception: {ex.Message}");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            try
            {
                var userId = GetCurrentUserId();
                
                if (!string.IsNullOrEmpty(userId))
                {
                    var result = await _authService.LogoutAsync(userId);
                    _auditService.LogSecurityEvent(SecurityEventType.LogoutSuccess, "User logged out", new { UserId = userId });
                }

                Response.Cookies.Delete("refresh_token");
                return Ok(new { message = "Logout realizado com sucesso" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout");
                return Ok(new { message = "Logout realizado" }); // Still return success for security
            }
        }

        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                var userId = GetCurrentUserId();
                
                if (string.IsNullOrEmpty(userId))
                {
                    _auditService.LogInvalidTokenAccess("access", "Missing user ID in token");
                    return NotFound(new { message = "Usuário não encontrado" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                
                if (user == null)
                {
                    _auditService.LogSuspiciousActivity("Profile access for non-existent user", $"UserId: {userId}");
                    return NotFound(new { message = "Usuário não encontrado" });
                }

                var profile = new UserProfile
                {
                    Id = user.Id,
                    Email = user.Email ?? string.Empty,
                    FullName = user.FullName,
                    AvatarUrl = user.AvatarUrl,
                    IsEmailVerified = user.IsEmailVerified,
                    Credits = user.CreditsAsInt,
                    Subscription = user.Subscription,
                    CreatedAt = user.CreatedAt
                };

                return Ok(profile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user profile");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var userId = GetCurrentUserId();
                
                if (string.IsNullOrEmpty(userId))
                {
                    _auditService.LogInvalidTokenAccess("change-password", "Missing user ID in token");
                    return NotFound(new { message = "Usuário não encontrado" });
                }

                var result = await _authService.ChangePasswordAsync(userId, request);
                
                if (result.Success)
                {
                    _auditService.LogSecurityEvent(SecurityEventType.LoginSuccess, "Password changed successfully", new { UserId = userId });
                }
                else
                {
                    _auditService.LogSuspiciousActivity("Failed password change", $"UserId: {userId}, Errors: {string.Join(", ", result.Errors ?? new[] { "Unknown" })}");
                }

                return result.Success ? Ok(new { message = result.Message }) : BadRequest(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpGet("confirm-email")]
        public async Task<IActionResult> ConfirmEmail(string userId, string token)
        {
            try
            {
                if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
                {
                    _auditService.LogSuspiciousActivity("Email confirmation with invalid parameters", $"UserId: {userId}, TokenPresent: {!string.IsNullOrEmpty(token)}");
                    return BadRequest(new { message = "Parâmetros inválidos" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                
                if (user == null)
                {
                    _auditService.LogSuspiciousActivity("Email confirmation for non-existent user", $"UserId: {userId}");
                    return BadRequest(new { message = "Usuário não encontrado" });
                }

                var result = await _userManager.ConfirmEmailAsync(user, token);
                
                if (!result.Succeeded)
                {
                    _auditService.LogSuspiciousActivity("Failed email confirmation", $"UserId: {userId}, Errors: {string.Join(", ", result.Errors.Select(e => e.Code))}");
                    return BadRequest(new { message = "Falha na confirmação do email", errors = result.Errors.Select(e => e.Description).ToArray() });
                }

                user.AccountStatus = AccountStatus.Active;
                await _userManager.UpdateAsync(user);
                
                _auditService.LogSecurityEvent(SecurityEventType.LoginSuccess, "Email confirmed successfully", new { UserId = userId, Email = user.Email });
                
                return Ok(new { message = "Email confirmado com sucesso. Agora pode fazer login." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error confirming email for user: {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                // Always return success for security (don't reveal if email exists)
                var user = await _userManager.FindByEmailAsync(request.Email);
                
                if (user != null)
                {
                    var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                    // TODO: Send password reset email
                    _auditService.LogSecurityEvent(SecurityEventType.LoginSuccess, "Password reset requested", new { Email = request.Email });
                }
                else
                {
                    _auditService.LogSuspiciousActivity("Password reset for non-existent email", $"Email: {request.Email}");
                }

                return Ok(new { message = "Se o email existir, será enviado um link de recuperação." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing forgot password request");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }
    }
}