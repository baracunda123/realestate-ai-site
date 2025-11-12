using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models;
using realestate_ia_site.Server.Infrastructure.Auth;
using realestate_ia_site.Server.Application.Security;
using realestate_ia_site.Server.Infrastructure.Storage;
using realestate_ia_site.Server.Application.Notifications.Interfaces;

namespace realestate_ia_site.Server.Presentation.Controllers
{
    public class ForgotPasswordRequest
    {
        [Required(ErrorMessage = "Email é obrigatório")]
        [EmailAddress(ErrorMessage = "Email inválido")]
        public string Email { get; set; } = string.Empty;
    }

    public class UpdateProfileRequest
    {
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? AvatarUrl { get; set; }
    }

    public class DeleteAccountRequest
    {
        [Required(ErrorMessage = "Password é obrigatória")]
        public string Password { get; set; } = string.Empty;
    }

    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("AuthPolicy")]
    public class AuthController : BaseController
    {
        private readonly UserManager<User> _userManager;
        private readonly AuthService _authService;
        private readonly GoogleAuthService _googleAuthService;
        private readonly SecurityAuditService _auditService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;
        private readonly IWebHostEnvironment _environment;
        private readonly IFileStorageService _fileStorageService;

        public AuthController(
            UserManager<User> userManager,
            AuthService authService,
            GoogleAuthService googleAuthService,
            SecurityAuditService auditService,
            IConfiguration configuration,
            ILogger<AuthController> logger,
            IWebHostEnvironment environment,
            IFileStorageService fileStorageService)
        {
            _userManager = userManager;
            _authService = authService;
            _googleAuthService = googleAuthService;
            _auditService = auditService;
            _configuration = configuration;
            _logger = logger;
            _environment = environment;
            _fileStorageService = fileStorageService;
        }

        private void SetRefreshCookie(TokenResponse tokens)
        {
            var isSecure = _environment.IsProduction() || Request.IsHttps;
            var host = Request.Host.Host;
            
            // Determinar domain do cookie baseado no host
            string? cookieDomain = null;
            if (host.EndsWith(".resideai.pt", StringComparison.OrdinalIgnoreCase))
            {
                // Se usar domínio customizado, configurar para aceitar subdomínios
                cookieDomain = ".resideai.pt";  // Permite www.resideai.pt E api.resideai.pt
            }
            // Se for Azure domain, deixar null (funciona só no mesmo domínio)

            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = isSecure,
                SameSite = SameSiteMode.None,
                Expires = DateTime.UtcNow.AddDays(2),
                Path = "/",
                Domain = cookieDomain  // Dynamic: .resideai.pt ou null
            };

            Response.Cookies.Append("refresh_token", tokens.RefreshToken, cookieOptions);
            
            _logger.LogInformation(
                "[Cookie] Refresh token cookie set - Expires={Expires}, SameSite={SameSite}, Secure={Secure}, Domain={Domain}", 
                cookieOptions.Expires, cookieOptions.SameSite, isSecure, cookieDomain ?? "NULL");
        }

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
                    
                    // Always return full tokens in body (client handles localStorage vs memory)
                    return Ok(AuthResult.SuccessResult(tokens, result.User!, result.Message ?? string.Empty));
                }

                return Ok(AuthResult.SuccessResult(new TokenResponse(), result.User!, result.Message ?? string.Empty));
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
                var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
                var (result, tokens) = await _authService.LoginAsync(request, ip, userAgent);
                
                if (!result.Success)
                {
                    _auditService.LogFailedLogin(request.Email, string.Join(", ", result.Errors ?? new[] { "Authentication failed" }));
                    return BadRequest(result);
                }

                if (tokens != null)
                {
                    SetRefreshCookie(tokens);
                    _auditService.LogSuccessfulLogin(result.User!.Id, result.User.Email);
                    
                    // Always return full tokens in body (client handles localStorage vs memory)
                    return Ok(AuthResult.SuccessResult(tokens, result.User!, result.Message ?? string.Empty));
                }

                return Ok(AuthResult.SuccessResult(new TokenResponse(), result.User!, result.Message ?? string.Empty));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login for email: {Email}", request.Email);
                _auditService.LogSuspiciousActivity("Login exception", $"Email: {request.Email}, Error: {ex.Message}");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpPost("google-login")]
        public async Task<IActionResult> GoogleLogin([FromBody] ExternalLoginRequest request)
        {
            try
            {
                _logger.LogInformation("Iniciando processo de Google Login...");
                
                if (!ModelState.IsValid)
                {
                    _logger.LogWarning("ModelState inválido para Google login");
                    _auditService.LogSuspiciousActivity("Invalid Google login data", $"Provider: {request.Provider}");
                    return BadRequest(ModelState);
                }

                if (request.Provider != "Google")
                {
                    _logger.LogWarning("Provider inválido: {Provider}", request.Provider);
                    _auditService.LogSuspiciousActivity("Invalid provider for Google login", $"Provider: {request.Provider}");
                    return BadRequest(new { message = "Provider inválido" });
                }

                var externalLoginInfo = await _googleAuthService.ValidateGoogleTokenAsync(request.AccessToken);
                if (externalLoginInfo == null)
                {
                    _logger.LogWarning("Validação do token Google falhou");
                    _auditService.LogSuspiciousActivity("Invalid Google token", "Google token validation failed");
                    return BadRequest(new { message = "Token do Google inválido" });
                }

                var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
                var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
                var (result, tokens) = await _authService.ExternalLoginAsync(externalLoginInfo, ip, userAgent, request.DeviceFingerprint);
                
                if (!result.Success)
                {
                    var email = externalLoginInfo.Principal.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "unknown";
                    _auditService.LogFailedLogin(email, string.Join(", ", result.Errors ?? new[] { "Google authentication failed" }));
                    return BadRequest(result);
                }

                if (tokens != null)
                {
                    SetRefreshCookie(tokens);
                    _auditService.LogSuccessfulLogin(result.User!.Id, result.User.Email);
                    
                    // Always return full tokens in body (client handles localStorage vs memory)
                    return Ok(AuthResult.SuccessResult(tokens, result.User!, result.Message ?? string.Empty));
                }

                return Ok(AuthResult.SuccessResult(new TokenResponse(), result.User!, result.Message ?? string.Empty));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro inesperado durante Google login");
                _auditService.LogSuspiciousActivity("Google login exception", $"Error: {ex.Message}");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest? bodyRequest = null)
        {
            try
            {
                _logger.LogInformation("[RefreshToken] Refresh attempt");
                
                // Try cookie first, then body fallback
                var refreshToken = Request.Cookies["refresh_token"];
                var tokenSource = "cookie";
                
                if (string.IsNullOrEmpty(refreshToken) && bodyRequest?.RefreshToken != null)
                {
                    refreshToken = bodyRequest.RefreshToken;
                    tokenSource = "body";
                }
                
                if (string.IsNullOrEmpty(refreshToken))
                {
                    _logger.LogWarning("[RefreshToken] No refresh token found");
                    _auditService.LogInvalidTokenAccess("refresh", "Missing refresh token");
                    return BadRequest(new { message = "Token de atualização não encontrado" });
                }

                _logger.LogDebug("[RefreshToken] Token source: {Source}", tokenSource);

                var (tokens, result) = await _authService.RefreshAsync(refreshToken);
                
                if (!result.Success || tokens == null)
                {
                    _logger.LogWarning("[RefreshToken] Refresh failed - {Message}", result.Message ?? "Unknown");
                    _auditService.LogInvalidTokenAccess("refresh", result.Message ?? "Refresh failed");
                    Response.Cookies.Delete("refresh_token", new CookieOptions { Path = "/" });
                    return BadRequest(result);
                }

                SetRefreshCookie(tokens);
                
                var userId = GetCurrentUserId();
                if (!string.IsNullOrEmpty(userId))
                {
                    _auditService.LogSecurityEvent(SecurityEventType.TokenRefresh, "Token refreshed successfully", new { UserId = userId });
                }

                // Always return complete token response
                var response = new { 
                    message = result.Message, 
                    token = tokens
                };
                
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[RefreshToken] Exception during refresh");
                _auditService.LogInvalidTokenAccess("refresh", $"Exception: {ex.Message}");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        public class RefreshTokenRequest
        {
            public string? RefreshToken { get; set; }
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

                Response.Cookies.Delete("refresh_token", new CookieOptions { Path = "/" });
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

        [HttpPost("upload-avatar")]
        [Authorize]
        [RequestSizeLimit(5 * 1024 * 1024)] // 5MB limit
        public async Task<IActionResult> UploadAvatar(IFormFile file)
        {
            try
            {
                var userId = GetCurrentUserId();
                
                if (string.IsNullOrEmpty(userId))
                {
                    _auditService.LogInvalidTokenAccess("upload-avatar", "Missing user ID in token");
                    return NotFound(new { success = false, error = "Usuário não encontrado" });
                }

                // Validate file
                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { success = false, error = "Nenhum arquivo enviado" });
                }

                // Validate content type
                var allowedTypes = new[] { "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp" };
                if (!allowedTypes.Contains(file.ContentType.ToLower()))
                {
                    return BadRequest(new { success = false, error = "Tipo de arquivo não suportado. Use JPG, PNG, GIF ou WebP." });
                }

                // Validate size (maximum 5MB)
                const long maxFileSize = 5 * 1024 * 1024; // 5MB
                if (file.Length > maxFileSize)
                {
                    return BadRequest(new { success = false, error = "A imagem deve ter no máximo 5MB" });
                }

                // Get user
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { success = false, error = "Usuário não encontrado" });
                }

                // Delete old avatar if exists
                if (!string.IsNullOrEmpty(user.AvatarUrl))
                {
                    try
                    {
                        await _fileStorageService.DeleteFileAsync(user.AvatarUrl);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Erro ao deletar avatar anterior: {AvatarUrl}", user.AvatarUrl);
                        // Continue even if deletion fails
                    }
                }

                // Upload new avatar
                string avatarUrl;
                await using (var stream = file.OpenReadStream())
                {
                    avatarUrl = await _fileStorageService.UploadFileAsync(stream, file.FileName, file.ContentType);
                }

                // Update user
                user.AvatarUrl = avatarUrl;
                user.UpdatedAt = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);

                _auditService.LogSecurityEvent(SecurityEventType.LoginSuccess, "Avatar updated successfully", new { UserId = userId, AvatarUrl = avatarUrl });
                _logger.LogInformation("Avatar atualizado para o utilizador {UserId}: {AvatarUrl}", userId, avatarUrl);

                return Ok(new { success = true, url = avatarUrl, message = "Avatar atualizado com sucesso" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro no upload do avatar para o utilizador {UserId}", GetCurrentUserId());
                return StatusCode(500, new { success = false, error = "Erro interno no servidor ao fazer upload da imagem" });
            }
        }

        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();
                
                if (string.IsNullOrEmpty(userId))
                {
                    _auditService.LogInvalidTokenAccess("update-profile", "Missing user ID in token");
                    return NotFound(new { message = "Utilizador não encontrado" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    _auditService.LogSuspiciousActivity("Profile update for non-existent user", $"UserId: {userId}");
                    return NotFound(new { message = "Utilizador não encontrado" });
                }

                // Atualizar campos
                if (!string.IsNullOrWhiteSpace(request.FullName))
                {
                    user.FullName = request.FullName.Trim();
                }

                if (!string.IsNullOrWhiteSpace(request.PhoneNumber))
                {
                    user.PhoneNumber = request.PhoneNumber.Trim();
                }

                if (!string.IsNullOrWhiteSpace(request.AvatarUrl))
                {
                    user.AvatarUrl = request.AvatarUrl;
                }

                user.UpdatedAt = DateTime.UtcNow;
                var result = await _userManager.UpdateAsync(user);

                if (!result.Succeeded)
                {
                    _auditService.LogSuspiciousActivity("Failed profile update", $"UserId: {userId}, Errors: {string.Join(", ", result.Errors.Select(e => e.Code))}");
                    return BadRequest(new { message = "Erro ao atualizar perfil", errors = result.Errors.Select(e => e.Description).ToArray() });
                }

                _auditService.LogSecurityEvent(SecurityEventType.LoginSuccess, "Profile updated successfully", new { UserId = userId });

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
                _logger.LogError(ex, "Error updating user profile");
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

        [HttpGet("confirm-email/{token}")]
        public async Task<IActionResult> ConfirmEmail(string token)
        {
            try
            {
                _logger.LogInformation("[Auth] Email confirmation attempt - Token length: {Length}", token?.Length ?? 0);
                
                if (string.IsNullOrEmpty(token))
                {
                    _logger.LogWarning("[Auth] Confirmation without token");
                    _auditService.LogSuspiciousActivity("Email confirmation without token", "No token provided");
                    return BadRequest(new { success = false, message = "Token inválido" });
                }

                string decodedToken;
                try
                {
                    var tokenBytes = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlDecode(token);
                    decodedToken = System.Text.Encoding.UTF8.GetString(tokenBytes);
                    
                    _logger.LogInformation("[Auth] Token decoded successfully (length: {Length})", decodedToken.Length);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[Auth] Failed to decode token");
                    return BadRequest(new { 
                        success = false, 
                        message = "Token inválido ou corrompido",
                        code = "INVALID_TOKEN" 
                    });
                }

                // Search only unconfirmed users created in last 24 hours
                var cutoffDate = DateTime.UtcNow.AddHours(-24);
                var pendingUsers = await _userManager.Users
                    .Where(u => !u.EmailConfirmed && u.CreatedAt > cutoffDate)
                    .OrderByDescending(u => u.CreatedAt)
                    .ToListAsync();
                
                _logger.LogInformation("[Auth] Found {Count} pending users in last 24h", pendingUsers.Count);
                
                User? confirmedUser = null;
                IdentityResult? confirmResult = null;
                
                // Try to confirm email for each pending user
                foreach (var user in pendingUsers)
                {
                    try
                    {
                        _logger.LogDebug("[Auth] Trying to confirm for userId={UserId} email={Email}", user.Id, user.Email);
                        
                        var result = await _userManager.ConfirmEmailAsync(user, decodedToken);
                        
                        if (result.Succeeded)
                        {
                            confirmedUser = user;
                            confirmResult = result;
                            _logger.LogInformation("[Auth] Confirmation successful for userId={UserId}", user.Id);
                            break;
                        }
                        else
                        {
                            _logger.LogDebug("[Auth] Confirmation failed for userId={UserId}: {Errors}", 
                                user.Id, string.Join(", ", result.Errors.Select(e => e.Code)));
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogDebug("[Auth] Exception trying to confirm userId={UserId}: {Message}", user.Id, ex.Message);
                        continue;
                    }
                }
                
                if (confirmedUser == null || confirmResult == null || !confirmResult.Succeeded)
                {
                    _logger.LogWarning("[Auth] Invalid or expired confirmation token - No match found");
                    _auditService.LogSuspiciousActivity("Failed email confirmation", "Invalid or expired token");
                    
                    return BadRequest(new { 
                        success = false,
                        message = "Link de confirmação inválido ou expirado. Solicite um novo email de confirmação.",
                        code = "INVALID_TOKEN"
                    });
                }

                // Update account status
                confirmedUser.AccountStatus = AccountStatus.Active;
                await _userManager.UpdateAsync(confirmedUser);
                
                _auditService.LogSecurityEvent(SecurityEventType.LoginSuccess, "Email confirmed successfully", 
                    new { UserId = confirmedUser.Id, Email = confirmedUser.Email });
                
                _logger.LogInformation("[Auth] Email confirmed successfully userId={UserId}", confirmedUser.Id);
                
                return Ok(new { success = true, message = "Email confirmado com sucesso! Agora pode fazer login." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Auth] Exception in email confirmation");
                return StatusCode(500, new { success = false, message = "Erro interno do servidor" });
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

        [HttpPost("resend-confirmation")]
        public async Task<IActionResult> ResendConfirmationEmail([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                var user = await _userManager.FindByEmailAsync(request.Email);
                
                // Always return success (don't reveal if email exists)
                if (user != null && !user.EmailConfirmed)
                {
                    var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                    
                    // Usar WebEncoders para encoding URL-safe (igual ao AuthService)
                    var urlSafeToken = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(
                        System.Text.Encoding.UTF8.GetBytes(token)
                    );
                    
                    var frontendUrl = Environment.GetEnvironmentVariable("APP_FRONTEND_URL")
                                   ?? _configuration["App:FrontendUrl"] 
                                   ?? "http://localhost:5173";
                    
                    var confirmLink = $"{frontendUrl}/confirm-email/{urlSafeToken}";
                    
                    //Enviar email usando IEmailService
                    var emailService = HttpContext.RequestServices.GetRequiredService<IEmailService>();
                    
                    var emailSent = await emailService.SendTemplateEmailAsync(
                        "email-confirmation",
                        user.Email!,
                        new { UserName = user.FullName, ConfirmationLink = confirmLink },
                        default
                    );
                    
                    if (emailSent)
                    {
                        _auditService.LogSecurityEvent(SecurityEventType.LoginSuccess, "Confirmation email resent", 
                            new { Email = request.Email });
                        
                        _logger.LogInformation("[Auth] Email de confirmação reenviado com sucesso para={Email}", request.Email);
                    }
                    else
                    {
                        _logger.LogError("[Auth] Falha ao reenviar email de confirmação para={Email}", request.Email);
                    }
                }
                else if (user != null && user.EmailConfirmed)
                {
                    _logger.LogInformation("[Auth] Email de confirmação NÃO enviado - email já confirmado anteriormente email={Email}", request.Email);
                }
                else
                {
                    _logger.LogWarning("[Auth] Resend attempt for non-existent email={Email}", request.Email);
                    _auditService.LogSuspiciousActivity("Confirmation resend for non-existent email", 
                        $"Email: {request.Email}");
                }

                return Ok(new { message = "Se o email existir e não estiver confirmado, um novo link será enviado." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Auth] Error resending confirmation email={Email}", request.Email);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpDelete("account")]
        [Authorize]
        public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request)
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
                    _auditService.LogInvalidTokenAccess("delete-account", "Missing user ID in token");
                    return Unauthorized(new { success = false, message = "Utilizador não autenticado" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    _auditService.LogSuspiciousActivity("Delete account for non-existent user", $"UserId: {userId}");
                    return NotFound(new { success = false, message = "Utilizador não encontrado" });
                }

                // Verificar a password antes de eliminar
                var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
                if (!passwordValid)
                {
                    _auditService.LogSuspiciousActivity("Delete account with invalid password", $"UserId: {userId}, Email: {user.Email}");
                    return BadRequest(new { success = false, message = "Password incorreta" });
                }

                _logger.LogWarning("[Auth] Account deletion initiated for userId={UserId}, email={Email}", userId, user.Email);

                // Eliminar avatar se existir
                if (!string.IsNullOrEmpty(user.AvatarUrl))
                {
                    try
                    {
                        await _fileStorageService.DeleteFileAsync(user.AvatarUrl);
                        _logger.LogInformation("[Auth] Avatar deleted for userId={UserId}", userId);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "[Auth] Failed to delete avatar for userId={UserId}", userId);
                        // Continue with account deletion even if avatar deletion fails
                    }
                }

                // Eliminar utilizador (cascade delete vai eliminar dados relacionados)
                var result = await _userManager.DeleteAsync(user);
                
                if (!result.Succeeded)
                {
                    var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                    _logger.LogError("[Auth] Failed to delete account for userId={UserId}: {Errors}", userId, errors);
                    _auditService.LogSuspiciousActivity("Failed account deletion", $"UserId: {userId}, Errors: {errors}");
                    return StatusCode(500, new { success = false, message = "Erro ao eliminar conta. Tente novamente." });
                }

                // Limpar cookie de refresh token
                Response.Cookies.Delete("refresh_token", new CookieOptions { Path = "/" });

                // Log de auditoria
                _auditService.LogSecurityEvent(SecurityEventType.LogoutSuccess, "Account deleted successfully", 
                    new { UserId = userId, Email = user.Email });
                
                _logger.LogWarning("[Auth] Account deleted successfully for userId={UserId}, email={Email}", userId, user.Email);

                return Ok(new { success = true, message = "Conta eliminada com sucesso" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Auth] Exception during account deletion for userId={UserId}", GetCurrentUserId());
                return StatusCode(500, new { success = false, message = "Erro interno do servidor" });
            }
        }
    }
}