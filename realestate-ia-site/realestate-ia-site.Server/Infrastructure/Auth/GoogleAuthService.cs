using Google.Apis.Auth;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;

namespace realestate_ia_site.Server.Infrastructure.Auth;

public class GoogleAuthService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<GoogleAuthService> _logger;

    public GoogleAuthService(IConfiguration configuration, ILogger<GoogleAuthService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<ExternalLoginInfo?> ValidateGoogleTokenAsync(string accessToken)
    {
        try
        {
            var clientId = _configuration["Google:ClientId"];
            if (string.IsNullOrEmpty(clientId))
            {
                _logger.LogError("Google Client ID não configurado");
                return null;
            }

            _logger.LogInformation("Iniciando validação do token Google...");
            _logger.LogInformation("Client ID configurado: {ClientId}", clientId.Substring(0, 20) + "...");
            _logger.LogInformation("Token recebido (preview): {Token}", accessToken.Substring(0, Math.Min(50, accessToken.Length)) + "...");

            // Validar o token do Google
            var payload = await GoogleJsonWebSignature.ValidateAsync(accessToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { clientId }
            });

            if (payload == null)
            {
                _logger.LogWarning("Token do Google inválido - payload é null");
                return null;
            }

            _logger.LogInformation("Token Google validado com sucesso!");
            _logger.LogInformation("Payload recebido - Email: {Email}, Name: {Name}, Subject: {Subject}", 
                payload.Email, payload.Name, payload.Subject);

            // Criar claims baseados no payload do Google
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, payload.Subject),
                new Claim(ClaimTypes.Email, payload.Email),
                new Claim(ClaimTypes.Name, payload.Name),
                new Claim(ClaimTypes.GivenName, payload.GivenName ?? string.Empty),
                new Claim(ClaimTypes.Surname, payload.FamilyName ?? string.Empty),
                new Claim("picture", payload.Picture ?? string.Empty),
                new Claim("email_verified", payload.EmailVerified.ToString())
            };

            var identity = new ClaimsIdentity(claims, "Google");
            var principal = new ClaimsPrincipal(identity);

            // Criar ExternalLoginInfo
            var loginInfo = new ExternalLoginInfo(
                principal,
                "Google",
                payload.Subject,
                "Google"
            );

            _logger.LogInformation("ExternalLoginInfo criado com sucesso para email: {Email}", payload.Email);
            return loginInfo;
        }
        catch (Google.Apis.Auth.InvalidJwtException ex)
        {
            _logger.LogWarning("Token JWT do Google inválido: {Message}", ex.Message);
            _logger.LogWarning("Detalhes do erro JWT: {Details}", ex.ToString());
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro inesperado ao validar token do Google");
            _logger.LogError("Tipo do erro: {ErrorType}, Mensagem: {Message}", ex.GetType().Name, ex.Message);
            return null;
        }
    }
}
