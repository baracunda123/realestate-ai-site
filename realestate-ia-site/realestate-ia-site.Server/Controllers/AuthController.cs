using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models;
using realestate_ia_site.Server.Application.Auth;

namespace realestate_ia_site.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("AuthPolicy")]
    public class AuthController : BaseController
    {
        private readonly UserManager<User> _userManager;
        private readonly AuthService _authService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            UserManager<User> userManager,
            AuthService authService,
            IConfiguration configuration,
            ILogger<AuthController> logger)
        {
            _userManager = userManager;
            _authService = authService;
            _configuration = configuration;
            _logger = logger;
        }

        private void SetRefreshCookie(TokenResponse tokens)
        {
            Response.Cookies.Append("refresh_token", tokens.RefreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = true,
                SameSite = SameSiteMode.Strict,
                Expires = tokens.ExpiresAt.AddDays(29), // refresh stored for period (service sets +30d)
                Path = "/api/auth"
            });
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
            if (!ModelState.IsValid) return BadRequest(ModelState);
            if (!request.AcceptTerms) return BadRequest(new { message = "Deve aceitar os termos de uso" });

            var (result, tokens) = await _authService.RegisterAsync(request);
            if (!result.Success) return BadRequest(result);
            if (tokens != null) SetRefreshCookie(tokens);
            return Ok(AuthResult.SuccessResult(tokens != null ? MaskRefresh(tokens) : new TokenResponse(), result.User!, result.Message ?? string.Empty));
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            var (result, tokens) = await _authService.LoginAsync(request, ip);
            if (!result.Success) return BadRequest(result);
            if (tokens != null) SetRefreshCookie(tokens);
            return Ok(AuthResult.SuccessResult(tokens != null ? MaskRefresh(tokens) : new TokenResponse(), result.User!, result.Message ?? string.Empty));
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken()
        {
            var refreshToken = Request.Cookies["refresh_token"];
            if (string.IsNullOrEmpty(refreshToken)) return BadRequest(new { message = "Token de atualização não encontrado" });
            var (tokens, result) = await _authService.RefreshAsync(refreshToken);
            if (!result.Success || tokens == null)
            {
                Response.Cookies.Delete("refresh_token");
                return BadRequest(result);
            }
            SetRefreshCookie(tokens);
            return Ok(new { message = result.Message, token = MaskRefresh(tokens) });
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            var userId = User.FindFirst("user_id")?.Value;
            if (string.IsNullOrEmpty(userId)) return Ok(new { message = "Logout realizado" });
            var result = await _authService.LogoutAsync(userId);
            Response.Cookies.Delete("refresh_token");
            return Ok(new { message = result.Message });
        }

        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            var userId = User.FindFirst("user_id")?.Value;
            if (string.IsNullOrEmpty(userId)) return NotFound(new { message = "Usuário não encontrado" });
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return NotFound(new { message = "Usuário não encontrado" });
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

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var userId = User.FindFirst("user_id")?.Value;
            if (string.IsNullOrEmpty(userId)) return NotFound(new { message = "Usuário não encontrado" });
            var result = await _authService.ChangePasswordAsync(userId, request);
            return result.Success ? Ok(new { message = result.Message }) : BadRequest(result);
        }

        [HttpGet("confirm-email")]
        public async Task<IActionResult> ConfirmEmail(string userId, string token)
        {
            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token)) return BadRequest(new { message = "Parâmetros inválidos" });
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return BadRequest(new { message = "Usuário não encontrado" });
            var result = await _userManager.ConfirmEmailAsync(user, token);
            if (!result.Succeeded)
            {
                return BadRequest(new { message = "Falha na confirmação do email", errors = result.Errors.Select(e => e.Description).ToArray() });
            }
            user.AccountStatus = AccountStatus.Active;
            await _userManager.UpdateAsync(user);
            return Ok(new { message = "Email confirmado com sucesso. Agora pode fazer login." });
        }
    }
}