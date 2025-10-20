using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models;
using realestate_ia_site.Server.Application.Auth;
using realestate_ia_site.Server.Application.Security;
using realestate_ia_site.Server.Infrastructure.Storage;

namespace realestate_ia_site.Server.Controllers
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

    // ✅ MOBILE FIX: Nova classe para aceitar refresh token no body
    public class RefreshTokenRequest
    {
        public string? RefreshToken { get; set; }
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
            // ✅ MOBILE FIX: Detectar se é mobile e NÃO definir cookie
            var userAgent = Request.Headers.UserAgent.ToString();
            var isMobile = userAgent.Contains("Mobile", StringComparison.OrdinalIgnoreCase) ||
                          userAgent.Contains("Android", StringComparison.OrdinalIgnoreCase) ||
                          userAgent.Contains("iPhone", StringComparison.OrdinalIgnoreCase) ||
                          userAgent.Contains("iPad", StringComparison.OrdinalIgnoreCase);
            
            // Se é mobile, NÃO definir cookie (será enviado no body)
            if (isMobile)
            {
                _logger.LogInformation("[Cookie] Mobile detectado - NÃO definindo cookie (será usado localStorage)");
                return;
            }
            
            // Desktop: usar cookie normalmente
            var sameSite = _environment.IsProduction() ? SameSiteMode.Lax : SameSiteMode.Lax;

            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = sameSite,
                Expires = tokens.ExpiresAt.AddDays(29),
                Path = "/"
            };

            Response.Cookies.Append("refresh_token", tokens.RefreshToken, cookieOptions);
            
            _logger.LogInformation(
                "[Cookie] Desktop detectado - Cookie definido - Path=/, SameSite={SameSite}, Secure=true",
                sameSite);
        }

        private static TokenResponse MaskRefresh(TokenResponse t, bool isMobile = false) => new()
        {
            AccessToken = t.AccessToken,
            RefreshToken = isMobile ? t.RefreshToken : string.Empty, // ✅ Retorna refresh token no body APENAS se mobile
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

                // Detectar mobile
                var userAgent = Request.Headers.UserAgent.ToString();
                var isMobile = userAgent.Contains("Mobile", StringComparison.OrdinalIgnoreCase) ||
                              userAgent.Contains("Android", StringComparison.OrdinalIgnoreCase) ||
                              userAgent.Contains("iPhone", StringComparison.OrdinalIgnoreCase);

                // Apenas definir cookie se tokens foram retornados
                if (tokens != null)
                {
                    SetRefreshCookie(tokens);
                    _auditService.LogSuccessfulLogin(result.User!.Id, result.User.Email);
                    return Ok(AuthResult.SuccessResult(MaskRefresh(tokens, isMobile), result.User!, result.Message ?? string.Empty));
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
                var (result, tokens) = await _authService.LoginAsync(request, ip);
                
                if (!result.Success)
                {
                    _auditService.LogFailedLogin(request.Email, string.Join(", ", result.Errors ?? new[] { "Authentication failed" }));
                    return BadRequest(result);
                }

                // ✅ MOBILE FIX: Detectar mobile
                var userAgent = Request.Headers.UserAgent.ToString();
                var isMobile = userAgent.Contains("Mobile", StringComparison.OrdinalIgnoreCase) ||
                              userAgent.Contains("Android", StringComparison.OrdinalIgnoreCase) ||
                              userAgent.Contains("iPhone", StringComparison.OrdinalIgnoreCase);

                if (tokens != null)
                {
                    SetRefreshCookie(tokens); // Só define cookie se NÃO for mobile
                    _auditService.LogSuccessfulLogin(result.User!.Id, result.User.Email);
                }

                return Ok(AuthResult.SuccessResult(tokens != null ? MaskRefresh(tokens, isMobile) : new TokenResponse(), result.User!, result.Message ?? string.Empty));
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
                var (result, tokens) = await _authService.ExternalLoginAsync(externalLoginInfo, ip);
                
                if (!result.Success)
                {
                    var email = externalLoginInfo.Principal.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value ?? "unknown";
                    _auditService.LogFailedLogin(email, string.Join(", ", result.Errors ?? new[] { "Google authentication failed" }));
                    return BadRequest(result);
                }

                // ✅ MOBILE FIX: Detectar mobile
                var userAgent = Request.Headers.UserAgent.ToString();
                var isMobile = userAgent.Contains("Mobile", StringComparison.OrdinalIgnoreCase) ||
                              userAgent.Contains("Android", StringComparison.OrdinalIgnoreCase) ||
                              userAgent.Contains("iPhone", StringComparison.OrdinalIgnoreCase);
                
                if (tokens != null)
                {
                    SetRefreshCookie(tokens); // Só define cookie se NÃO for mobile
                    _auditService.LogSuccessfulLogin(result.User!.Id, result.User.Email);
                }

                var response = AuthResult.SuccessResult(tokens != null ? MaskRefresh(tokens, isMobile) : new TokenResponse(), result.User!, result.Message ?? string.Empty);
                
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro inesperado durante Google login");
                _auditService.LogSuspiciousActivity("Google login exception", $"Error: {ex.Message}");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest? request)
        {
            try
            {
                // ✅ MOBILE FIX CRÍTICO: Aceitar refresh token no BODY também
                var userAgent = Request.Headers.UserAgent.ToString();
                var sessionId = Request.Headers["X-Session-ID"].ToString();
                var isMobile = userAgent.Contains("Mobile", StringComparison.OrdinalIgnoreCase) ||
                              userAgent.Contains("Android", StringComparison.OrdinalIgnoreCase) ||
                              userAgent.Contains("iPhone", StringComparison.OrdinalIgnoreCase);
                
                _logger.LogInformation(
                    "[RefreshToken] Tentativa - UserAgent={UserAgent}, SessionId={SessionId}, IsMobile={IsMobile}",
                    userAgent, sessionId, isMobile);
                
                // Tentar obter refresh token de múltiplas fontes (mobile-first)
                string? refreshToken = null;
                
                // 1️⃣ Prioridade: Body (mobile pode enviar aqui)
                if (request?.RefreshToken != null && !string.IsNullOrEmpty(request.RefreshToken))
                {
                    refreshToken = request.RefreshToken;
                    _logger.LogInformation("[RefreshToken] ✅ Token obtido do BODY (Mobile)");
                }
                // 2️⃣ Fallback: Cookie (desktop)
                else
                {
                    refreshToken = Request.Cookies["refresh_token"];
                    if (!string.IsNullOrEmpty(refreshToken))
                    {
                        _logger.LogInformation("[RefreshToken] ✅ Token obtido do COOKIE (Desktop)");
                    }
                }
                
                if (string.IsNullOrEmpty(refreshToken))
                {
                    _logger.LogWarning(
                        "[RefreshToken] ❌ Token NÃO ENCONTRADO - Mobile={IsMobile}, HasBody={HasBody}, Cookies={CookieCount}",
                        isMobile,
                        request != null,
                        Request.Cookies.Count);
                    
                    _auditService.LogInvalidTokenAccess("refresh", "Missing refresh token");
                    return BadRequest(new { message = "Token de atualização não encontrado" });
                }

                var (tokens, result) = await _authService.RefreshAsync(refreshToken);
                
                if (!result.Success || tokens == null)
                {
                    _logger.LogWarning(
                        "[RefreshToken] Refresh falhou - Motivo={Message}",
                        result.Message ?? "Desconhecido");
                    
                    _auditService.LogInvalidTokenAccess("refresh", result.Message ?? "Refresh failed");
                    Response.Cookies.Delete("refresh_token", new CookieOptions { Path = "/" });
                    return BadRequest(result);
                }

                // ✅ Retornar refresh token no body para mobile armazenar
                SetRefreshCookie(tokens);
                
                var userId = GetCurrentUserId();
                if (!string.IsNullOrEmpty(userId))
                {
                    _auditService.LogSecurityEvent(SecurityEventType.TokenRefresh, "Token refreshed successfully", new { UserId = userId });
                    _logger.LogInformation("[RefreshToken] ✅ Refresh bem-sucedido - UserId={UserId}", userId);
                }

                // ✅ MOBILE FIX: Retornar refresh token no body também (só para mobile)
                var response = new { 
                    message = result.Message, 
                    token = new {
                        accessToken = tokens.AccessToken,
                        refreshToken = isMobile ? tokens.RefreshToken : string.Empty, // ✅ Só envia no body se mobile
                        expiresAt = tokens.ExpiresAt,
                        tokenType = tokens.TokenType
                    }
                };
                
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[RefreshToken] Exceção durante refresh");
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

                // ✅ MOBILE FIX: Deletar com Path="/" também
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
                _logger.LogInformation("Avatar atualizado para usuário {UserId}: {AvatarUrl}", userId, avatarUrl);

                return Ok(new { success = true, url = avatarUrl, message = "Avatar atualizado com sucesso" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro no upload do avatar para usuário {UserId}", GetCurrentUserId());
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
                    return NotFound(new { message = "Usuário não encontrado" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    _auditService.LogSuspiciousActivity("Profile update for non-existent user", $"UserId: {userId}");
                    return NotFound(new { message = "Usuário não encontrado" });
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
                _logger.LogInformation("[Auth] Tentativa de confirmação de email - Token recebido (comprimento: {Length})", token?.Length ?? 0);
                
                if (string.IsNullOrEmpty(token))
                {
                    _logger.LogWarning("[Auth] Confirmação sem token");
                    _auditService.LogSuspiciousActivity("Email confirmation without token", "No token provided");
                    return BadRequest(new { success = false, message = "Token inválido" });
                }

                // Decodificar usando WebEncoders (biblioteca oficial Microsoft)
                // Muito mais simples que replace manual
                string decodedToken;
                try
                {
                    var tokenBytes = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlDecode(token);
                    decodedToken = System.Text.Encoding.UTF8.GetString(tokenBytes);
                    
                    _logger.LogInformation("[Auth] Token decodificado com sucesso (comprimento: {Length})", decodedToken.Length);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[Auth] Falha ao decodificar token");
                    return BadRequest(new { 
                        success = false, 
                        message = "Token inválido ou corrompido",
                        code = "INVALID_TOKEN" 
                    });
                }

                // Buscar apenas usuários não confirmados criados nas últimas 24 horas
                var cutoffDate = DateTime.UtcNow.AddHours(-24);
                var pendingUsers = await _userManager.Users
                    .Where(u => !u.EmailConfirmed && u.CreatedAt > cutoffDate)
                    .OrderByDescending(u => u.CreatedAt)
                    .ToListAsync();
                
                _logger.LogInformation("[Auth] Encontrados {Count} utilizadores pendentes de confirmação nas últimas 24h", pendingUsers.Count);
                
                User? confirmedUser = null;
                IdentityResult? confirmResult = null;
                
                // Tentar confirmar o email para cada usuário pendente
                foreach (var user in pendingUsers)
                {
                    try
                    {
                        _logger.LogDebug("[Auth] Tentando confirmar para userId={UserId} email={Email}", user.Id, user.Email);
                        
                        var result = await _userManager.ConfirmEmailAsync(user, decodedToken);
                        
                        if (result.Succeeded)
                        {
                            confirmedUser = user;
                            confirmResult = result;
                            _logger.LogInformation("[Auth] Confirmação bem-sucedida para userId={UserId}", user.Id);
                            break;
                        }
                        else
                        {
                            _logger.LogDebug("[Auth] Confirmação falhou para userId={UserId}: {Errors}", 
                                user.Id, string.Join(", ", result.Errors.Select(e => e.Code)));
                        }
                    }
                    catch (Exception ex)
                    {
                        // Token não pertence a este usuário, continuar
                        _logger.LogDebug("[Auth] Exceção ao tentar confirmar userId={UserId}: {Message}", user.Id, ex.Message);
                        continue;
                    }
                }
                
                if (confirmedUser == null || confirmResult == null || !confirmResult.Succeeded)
                {
                    _logger.LogWarning("[Auth] Token de confirmação inválido ou expirado - Nenhum match encontrado");
                    _auditService.LogSuspiciousActivity("Failed email confirmation", "Invalid or expired token");
                    
                    return BadRequest(new { 
                        success = false,
                        message = "Link de confirmação inválido ou expirado. Solicite um novo email de confirmação.",
                        code = "INVALID_TOKEN"
                    });
                }

                // Atualizar status da conta
                confirmedUser.AccountStatus = AccountStatus.Active;
                await _userManager.UpdateAsync(confirmedUser);
                
                _auditService.LogSecurityEvent(SecurityEventType.LoginSuccess, "Email confirmed successfully", 
                    new { UserId = confirmedUser.Id, Email = confirmedUser.Email });
                
                _logger.LogInformation("[Auth] Email confirmado com sucesso userId={UserId}", confirmedUser.Id);
                
                return Ok(new { success = true, message = "Email confirmado com sucesso! Agora pode fazer login." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Auth] Exceção na confirmação email");
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
                
                // Sempre retornar sucesso (não revelar se email existe)
                if (user != null && !user.EmailConfirmed)
                {
                    var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                    
                    // Gerar URL com token como path parameter
                    var encodedToken = Uri.EscapeDataString(token);
                    var frontendUrl = _configuration["App:FrontendUrl"] ?? "http://localhost:5173";
                    var confirmLink = $"{frontendUrl}/confirm-email/{encodedToken}";
                    
                    // TODO: Enviar email (requer acesso ao EmailService)
                    // Por enquanto apenas logar
                    
                    _auditService.LogSecurityEvent(SecurityEventType.LoginSuccess, "Confirmation email resent", 
                        new { Email = request.Email });
                    
                    _logger.LogInformation("[Auth] Email de confirmação reenviado para={Email}", request.Email);
                }
                else if (user != null && user.EmailConfirmed)
                {
                    _logger.LogInformation("[Auth] Tentativa de reenvio para email já confirmado={Email}", request.Email);
                }
                else
                {
                    _logger.LogWarning("[Auth] Tentativa de reenvio para email inexistente={Email}", request.Email);
                    _auditService.LogSuspiciousActivity("Confirmation resend for non-existent email", 
                        $"Email: {request.Email}");
                }

                return Ok(new { message = "Se o email existir e não estiver confirmado, um novo link foi enviado." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Auth] Erro ao reenviar confirmação email={Email}", request.Email);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }
    }
}