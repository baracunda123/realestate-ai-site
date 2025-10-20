using realestate_ia_site.Server.Application.Auth;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace realestate_ia_site.Server.Middleware;

/// <summary>
/// Middleware que verifica refresh token do cookie e renova access token automaticamente
/// Adiciona header X-New-Access-Token quando o token é renovado
/// </summary>
public class TokenRefreshMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TokenRefreshMiddleware> _logger;

    public TokenRefreshMiddleware(RequestDelegate next, ILogger<TokenRefreshMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, AuthService authService, IConfiguration config)
    {
        // Ignorar endpoints de autenticação
        if (IsAuthEndpoint(context.Request.Path))
        {
            await _next(context);
            return;
        }

        // Verificar se tem refresh token no cookie
        if (!context.Request.Cookies.TryGetValue("refresh_token", out var refreshToken) || 
            string.IsNullOrEmpty(refreshToken))
        {
            await _next(context);
            return;
        }

        // Verificar se já tem Authorization header válido
        var authHeader = context.Request.Headers.Authorization.ToString();
        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer "))
        {
            var existingToken = authHeader.Substring(7);
            if (IsTokenValid(existingToken, config))
            {
                // Token ainda válido, não precisa renovar
                await _next(context);
                return;
            }
        }

        // Token expirado ou ausente - tentar renovar via cookie usando AuthService
        try
        {
            var (newTokens, result) = await authService.RefreshAsync(refreshToken);

            if (newTokens != null && result.Success)
            {
                // IMPORTANTE: Adicionar header customizado para o cliente saber que o token foi renovado
                context.Response.OnStarting(() =>
                {
                    context.Response.Headers["X-New-Access-Token"] = newTokens.AccessToken;
                    context.Response.Headers["X-Token-Expires-At"] = newTokens.ExpiresAt.ToString("O"); // ISO 8601 format
                    
                    _logger.LogInformation("[TokenRefresh] Token renovado via middleware - ExpiresAt={ExpiresAt}", 
                        newTokens.ExpiresAt);
                    return Task.CompletedTask;
                });

                // Adicionar token ao contexto para a requisição atual
                context.Request.Headers.Authorization = $"Bearer {newTokens.AccessToken}";
            }
            else
            {
                _logger.LogDebug("[TokenRefresh] Refresh token inválido ou expirado");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TokenRefresh] Erro ao renovar token automaticamente");
        }

        await _next(context);
    }

    private bool IsAuthEndpoint(PathString path)
    {
        return path.StartsWithSegments("/api/auth/login") ||
               path.StartsWithSegments("/api/auth/register") ||
               path.StartsWithSegments("/api/auth/refresh-token") ||
               path.StartsWithSegments("/api/auth/confirm-email") ||
               path.StartsWithSegments("/api/auth/forgot-password") ||
               path.StartsWithSegments("/api/auth/reset-password") ||
               path.StartsWithSegments("/api/auth/google-login");
    }

    private bool IsTokenValid(string token, IConfiguration config)
    {
        try
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(config["Jwt:SecretKey"]!);

            tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = config["Jwt:Issuer"],
                ValidateAudience = true,
                ValidAudience = config["Jwt:Audience"],
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out _);

            return true;
        }
        catch
        {
            return false;
        }
    }
}
