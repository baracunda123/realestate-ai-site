using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models;
using realestate_ia_site.Server.Infrastructure.Notifications;

namespace realestate_ia_site.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("AuthPolicy")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<User> _userManager;
        private readonly SignInManager<User> _signInManager;
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;
        private readonly IEmailService _emailService;

        public AuthController(
            UserManager<User> userManager,
            SignInManager<User> signInManager,
            ApplicationDbContext context,
            IConfiguration configuration,
            ILogger<AuthController> logger,
            IEmailService emailService)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _context = context;
            _configuration = configuration;
            _logger = logger;
            _emailService = emailService;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (!request.AcceptTerms)
                return BadRequest(new { message = "Deve aceitar os termos de uso" });

            try
            {
                // Verificar se email já existe
                var existingUser = await _userManager.FindByEmailAsync(request.Email);
                if (existingUser != null)
                    return BadRequest(new { message = "Email já está em uso" });

                // Criar utilizador
                var user = new User
                {
                    UserName = request.Email.ToLowerInvariant(),
                    Email = request.Email.ToLowerInvariant(),
                    FullName = request.FullName.Trim(),
                    PhoneNumber = request.PhoneNumber?.Trim(),
                    AccountStatus = AccountStatus.PendingVerification,
                    CreatedAt = DateTime.UtcNow,
                    TokenIdentifier = Guid.NewGuid().ToString()
                };

                var result = await _userManager.CreateAsync(user, request.Password);
                
                if (!result.Succeeded)
                {
                    return BadRequest(new { 
                        message = "Falha no registro", 
                        errors = result.Errors.Select(e => e.Description).ToArray() 
                    });
                }

                // Gerar token de confirmação de email
                var emailToken = await _userManager.GenerateEmailConfirmationTokenAsync(user);
                await SendEmailConfirmationAsync(user, emailToken);

                _logger.LogInformation("Utilizador {Email} registrado com sucesso", request.Email);

                // Gerar tokens JWT
                var tokens = await GenerateTokensAsync(user);
                var userProfile = MapToUserProfile(user);

                // Enviar refresh token como cookie HttpOnly
                Response.Cookies.Append("refresh_token", tokens.RefreshToken, new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTime.UtcNow.AddDays(30),
                    Path = "/api/auth"
                });

                // Não enviar refresh token na resposta
                var responseTokens = new TokenResponse
                {
                    AccessToken = tokens.AccessToken,
                    RefreshToken = "", // Não enviar na resposta
                    ExpiresAt = tokens.ExpiresAt,
                    TokenType = tokens.TokenType
                };

                return Ok(AuthResult.SuccessResult(
                    responseTokens, 
                    userProfile, 
                    "Registo realizado com sucesso. Verifique seu email para ativar a conta."
                ));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro durante registo do utilizador {Email}", request.Email);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var user = await _userManager.FindByEmailAsync(request.Email);
                
                if (user == null)
                {
                    _logger.LogWarning("Tentativa de login com email inexistente: {Email}", request.Email);
                    return BadRequest(new { message = "Email ou palavra-passe inválidos." });
                }

                // Verificar se conta está bloqueada
                if (user.IsLocked)
                {
                    _logger.LogWarning("Tentativa de login em conta bloqueada: {Email}", request.Email);
                    return BadRequest(new { message = "Conta temporariamente bloqueada" });
                }

                // Verificar se email foi confirmado
                if (!await _userManager.IsEmailConfirmedAsync(user))
                {
                    _logger.LogWarning("Tentativa de login com email não confirmado: {Email}", request.Email);
                    return BadRequest(new { message = "Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada." });
                }

                // Verificar senha
                var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
                
                if (!passwordValid)
                {
                    user.IncrementFailedLogin();
                    await _userManager.UpdateAsync(user);
                    
                    _logger.LogWarning("Senha inválida para {Email}", request.Email);
                    return BadRequest(new { message = "Email ou palavra-passe inválidos." });
                }

                // Login bem-sucedido
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                user.UpdateLastLogin(ipAddress);
                await _userManager.UpdateAsync(user);

                // Criar sessão de login
                await CreateLoginSessionAsync(user, ipAddress);

                // Gerar tokens
                var tokens = await GenerateTokensAsync(user);
                var userProfile = MapToUserProfile(user);

                // Enviar refresh token como cookie HttpOnly
                Response.Cookies.Append("refresh_token", tokens.RefreshToken, new CookieOptions
                {
                    HttpOnly = true,        // Não acessível via JavaScript (proteção XSS)
                    Secure = true,          // Apenas HTTPS
                    SameSite = SameSiteMode.Strict, // Proteção CSRF
                    Expires = DateTime.UtcNow.AddDays(30),
                    Path = "/api/auth"      // Apenas para endpoints de auth
                });

                _logger.LogInformation("Login bem-sucedido para {Email}", request.Email);

                // Retornar apenas access token na resposta
                var responseTokens = new TokenResponse
                {
                    AccessToken = tokens.AccessToken,
                    RefreshToken = "", // Não enviar na resposta
                    ExpiresAt = tokens.ExpiresAt,
                    TokenType = tokens.TokenType
                };

                return Ok(AuthResult.SuccessResult(
                    responseTokens, 
                    userProfile, 
                    "Login realizado com sucesso"
                ));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro durante login do utilizador {Email}", request.Email);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken()
        {
            try
            {
                //  Validar origem da requisição
                var origin = Request.Headers["Origin"].ToString();
                var allowedOrigins = _configuration.GetSection("AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
                
                if (!string.IsNullOrEmpty(origin) && !allowedOrigins.Contains(origin))
                {
                    return BadRequest(new { message = "Origem não autorizada" });
                }

                var refreshToken = Request.Cookies["refresh_token"];
                
                if (string.IsNullOrEmpty(refreshToken))
                {
                    return BadRequest(new { message = "Token de atualização não encontrado" });
                }

                var user = await _userManager.Users
                    .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);

                if (user == null || user.RefreshTokenExpires < DateTime.UtcNow)
                {
                    // Limpar cookie inválido
                    Response.Cookies.Delete("refresh_token");
                    return BadRequest(new { message = "Token de atualização inválido ou expirado" });
                }

                var tokens = await GenerateTokensAsync(user);
                
                // Atualizar cookie com novo refresh token
                Response.Cookies.Append("refresh_token", tokens.RefreshToken, new CookieOptions
                {
                    HttpOnly = true,
                    Secure = true,
                    SameSite = SameSiteMode.Strict,
                    Expires = DateTime.UtcNow.AddDays(30),
                    Path = "/api/auth"
                });
                
                // Retornar apenas access token
                var responseTokens = new TokenResponse
                {
                    AccessToken = tokens.AccessToken,
                    RefreshToken = "", // Não enviar na resposta
                    ExpiresAt = tokens.ExpiresAt,
                    TokenType = tokens.TokenType
                };
                
                return Ok(new { 
                    message = "Token atualizado com sucesso",
                    token = responseTokens 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao atualizar token");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            try
            {
                var userId = User.FindFirst("user_id")?.Value;
                if (userId != null)
                {
                    var user = await _userManager.FindByIdAsync(userId);
                    if (user != null)
                    {
                        // Invalidar refresh token
                        user.RefreshToken = null;
                        user.RefreshTokenExpires = null;
                        await _userManager.UpdateAsync(user);

                        // Desativar sessões ativas
                        var activeSessions = await _context.UserLoginSessions
                            .Where(s => s.UserId == userId && s.IsActive)
                            .ToListAsync();

                        foreach (var session in activeSessions)
                        {
                            session.IsActive = false;
                            session.LogoutAt = DateTime.UtcNow;
                        }

                        await _context.SaveChangesAsync();
                    }
                }

                // Limpar cookie do refresh token
                Response.Cookies.Delete("refresh_token");

                return Ok(new { message = "Logout realizado com sucesso" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro durante logout");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            try
            {
                var userId = User.FindFirst("user_id")?.Value;
                var user = await _userManager.FindByIdAsync(userId!);
                
                if (user == null)
                    return NotFound(new { message = "Usuário não encontrado" });

                var userProfile = MapToUserProfile(user);
                return Ok(userProfile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao recuperar perfil");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var userId = User.FindFirst("user_id")?.Value;
                var user = await _userManager.FindByIdAsync(userId!);
                
                if (user == null)
                    return NotFound(new { message = "Usuário não encontrado" });

                var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
                
                if (!result.Succeeded)
                {
                    return BadRequest(new { 
                        message = "Falha ao alterar senha", 
                        errors = result.Errors.Select(e => e.Description).ToArray() 
                    });
                }

                user.PasswordChangedAt = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);

                return Ok(new { message = "Senha alterada com sucesso" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao alterar senha");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        [HttpGet("confirm-email")]
        public async Task<IActionResult> ConfirmEmail(string userId, string token)
        {
            try
            {
                if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
                    return BadRequest(new { message = "Parâmetros inválidos" });

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                    return BadRequest(new { message = "Usuário não encontrado" });

                var result = await _userManager.ConfirmEmailAsync(user, token);
                
                if (!result.Succeeded)
                {
                    return BadRequest(new { 
                        message = "Falha na confirmação do email",
                        errors = result.Errors.Select(e => e.Description).ToArray()
                    });
                }

                // Atualizar status da conta
                user.AccountStatus = AccountStatus.Active;
                await _userManager.UpdateAsync(user);

                _logger.LogInformation("Email confirmado com sucesso para usuário {UserId}", userId);
                
                return Ok(new { message = "Email confirmado com sucesso. Agora pode fazer login." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro na confirmação de email para usuário {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        private async Task<TokenResponse> GenerateTokensAsync(User user)
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.Id),
                new(ClaimTypes.Email, user.Email ?? ""),
                new(ClaimTypes.Name, user.FullName ?? ""),
                new("user_id", user.Id),
                new("email_verified", user.IsEmailVerified.ToString()),
                new("account_status", user.AccountStatus.ToString())
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:SecretKey"]!));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expiry = DateTime.UtcNow.AddMinutes(int.Parse(_configuration["Jwt:ExpiryMinutes"] ?? "60"));

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: expiry,
                signingCredentials: credentials
            );

            var accessToken = new JwtSecurityTokenHandler().WriteToken(token);
            var refreshToken = GenerateRefreshToken();

            // Salvar refresh token
            user.RefreshToken = refreshToken;
            user.RefreshTokenExpires = DateTime.UtcNow.AddDays(30);
            await _userManager.UpdateAsync(user);

            return new TokenResponse
            {
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = expiry,
                TokenType = "Bearer"
            };
        }

        private static string GenerateRefreshToken()
        {
            var randomBytes = new byte[32];
            using var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomBytes);
            return Convert.ToBase64String(randomBytes);
        }

        private async Task CreateLoginSessionAsync(User user, string? ipAddress)
        {
            var userAgent = Request.Headers["User-Agent"].ToString();
            
            var session = new UserLoginSession
            {
                UserId = user.Id,
                SessionToken = Guid.NewGuid().ToString(),
                IpAddress = ipAddress,
                UserAgent = userAgent,
                ExpiresAt = DateTime.UtcNow.AddDays(30)
            };

            _context.UserLoginSessions.Add(session);
            await _context.SaveChangesAsync();
        }

        private async Task SendEmailConfirmationAsync(User user, string token)
        {
            var confirmationLink = $"{_configuration["App:BaseUrl"]}/confirm-email?userId={user.Id}&token={Uri.EscapeDataString(token)}";
            
            // Implementar envio de email de confirmação
            await _emailService.SendTemplateEmailAsync("email-confirmation", user.Email!, new
            {
                UserName = user.FullName,
                ConfirmationLink = confirmationLink
            });
        }

        private static UserProfile MapToUserProfile(User user)
        {
            return new UserProfile
            {
                Id = user.Id,
                Email = user.Email ?? "",
                FullName = user.FullName,
                AvatarUrl = user.AvatarUrl,
                IsEmailVerified = user.IsEmailVerified,
                Credits = int.TryParse(user.Credits, out var credits) ? credits : 0, // Conversão de string para int
                Subscription = user.Subscription,
                CreatedAt = user.CreatedAt
            };
        }
    }
}