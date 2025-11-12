using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Cryptography;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models;
using realestate_ia_site.Server.Application.Notifications.Interfaces;
using realestate_ia_site.Server.Application.Common.Interfaces;

namespace realestate_ia_site.Server.Infrastructure.Auth;

public class AuthService
{
    private readonly UserManager<User> _userManager;
    private readonly IEmailService _emailService;
    private readonly IApplicationDbContext _context;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthService> _logger;

    public AuthService(UserManager<User> userManager,
        IEmailService emailService,
        IApplicationDbContext context,
        IConfiguration config,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _emailService = emailService;
        _context = context;
        _config = config;
        _logger = logger;
    }

    public async Task<(AuthResult result, TokenResponse? tokens)> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email);
        if (existing != null)
        {
            _logger.LogWarning("[Auth] Tentativa de registo com email já existente email={Email}", request.Email);
            return (AuthResult.ErrorResult("Email já em uso!"), null);
        }

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

        var create = await _userManager.CreateAsync(user, request.Password);
        if (!create.Succeeded)
        {
            _logger.LogWarning("[Auth] Falha no registo email={Email} errors={Errors}", request.Email, string.Join(';', create.Errors.Select(e => e.Code)));
            return (AuthResult.ErrorResult(create.Errors.Select(e => e.Description).ToArray()), null);
        }

        // Enviar email de confirmação
        var emailToken = await _userManager.GenerateEmailConfirmationTokenAsync(user);
        await SendEmailConfirmationAsync(user, emailToken, ct);
        
        _logger.LogInformation("[Auth] Registo efetuado utilizador={UserId} email={Email} - aguardando confirmação de email", user.Id, user.Email);
        
        // NÃO retornar tokens - utilizador deve confirmar email primeiro
        return (AuthResult.SuccessResult(new TokenResponse(), MapToUserProfile(user), "Registo realizado com sucesso. Por favor, verifique o seu email para confirmar a conta."), null);
    }

    public async Task<(AuthResult result, TokenResponse? tokens)> LoginAsync(LoginRequest request, string? ip, string? userAgent, CancellationToken ct = default)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null)
        {
            _logger.LogWarning("[Auth] Login falhou - email inexistente email={Email}", request.Email);
            return (AuthResult.ErrorResult("Email ou palavra-passe inválidos."), null);
        }

        if (user.IsLocked)
        {
            _logger.LogWarning("[Auth] Login bloqueado utilizador={UserId} até={LockedUntil}", user.Id, user.LockedUntil);
            return (AuthResult.ErrorResult("Conta temporariamente bloqueada"), null);
        }

        if (!await _userManager.IsEmailConfirmedAsync(user))
        {
            _logger.LogWarning("[Auth] Login sem email confirmado utilizador={UserId}", user.Id);
            return (AuthResult.ErrorResult("Confirme o email antes de entrar."), null);
        }

        if (!await _userManager.CheckPasswordAsync(user, request.Password))
        {
            user.IncrementFailedLogin();
            await _userManager.UpdateAsync(user);
            _logger.LogWarning("[Auth] Password inválida utilizador={UserId} tentativas={Attempts}", user.Id, user.FailedLoginAttempts);
            return (AuthResult.ErrorResult("Email ou palavra-passe inválidos."), null);
        }

        user.UpdateLastLogin(ip);
        await _userManager.UpdateAsync(user);
        await CreateLoginSessionAsync(user, ip, userAgent, request.DeviceFingerprint, ct);
        
        // CORRIGIDO: Verificar se já tem refresh token válido
        bool needsNewRefreshToken = string.IsNullOrEmpty(user.RefreshToken) || 
                                     !user.RefreshTokenExpires.HasValue || 
                                     user.RefreshTokenExpires.Value < DateTime.UtcNow;
        
        TokenResponse tokens;
        
        if (needsNewRefreshToken)
        {
            // Gerar novos tokens (access + refresh)
            tokens = await GenerateTokensAsync(user, ct);
            _logger.LogInformation("[Auth] Novos tokens gerados no login - UserId: {UserId}", user.Id);
        }
        else
        {
            // Reutilizar refresh token existente, gerar apenas novo access token
            tokens = new TokenResponse
            {
                AccessToken = await GenerateAccessTokenAsync(user),
                RefreshToken = user.RefreshToken!,
                ExpiresAt = DateTime.UtcNow.AddMinutes(int.Parse(_config["Jwt:ExpiryMinutes"] ?? "60")),
                TokenType = "Bearer"
            };
            _logger.LogInformation("[Auth] Refresh token reutilizado no login - UserId: {UserId}, Expira: {Expires}", 
                user.Id, user.RefreshTokenExpires.Value);
        }
        
        _logger.LogInformation("[Auth] Login bem-sucedido utilizador={UserId} ip={IP}", user.Id, ip);
        return (AuthResult.SuccessResult(tokens, MapToUserProfile(user), "Login realizado com sucesso"), tokens);
    }

    public async Task<(AuthResult result, TokenResponse? tokens)> ExternalLoginAsync(ExternalLoginInfo externalLoginInfo, string? ip, string? userAgent, string? deviceFingerprint = null, CancellationToken ct = default)
    {
        _logger.LogInformation("[ExternalLogin] Iniciando login externo...");
        
        var email = externalLoginInfo.Principal.FindFirstValue(ClaimTypes.Email);
        var name = externalLoginInfo.Principal.FindFirstValue(ClaimTypes.Name);
        var givenName = externalLoginInfo.Principal.FindFirstValue(ClaimTypes.GivenName);
        var surname = externalLoginInfo.Principal.FindFirstValue(ClaimTypes.Surname);
        var picture = externalLoginInfo.Principal.FindFirstValue("picture");

        _logger.LogInformation("[ExternalLogin] Claims extraídos - Email: {Email}, Name: {Name}, Provider: {Provider}", 
            email, name, externalLoginInfo.LoginProvider);

        if (string.IsNullOrEmpty(email))
        {
            _logger.LogWarning("[ExternalLogin] Email não fornecido pelo provider={Provider}", externalLoginInfo.LoginProvider);
            return (AuthResult.ErrorResult("Email obrigatório para criar conta."), null);
        }

        _logger.LogInformation("[ExternalLogin] Procurando utilizador existente com login externo...");
        
        // Verificar se já existe um utilizador com este login externo
        var user = await _userManager.FindByLoginAsync(externalLoginInfo.LoginProvider, externalLoginInfo.ProviderKey);
        
        if (user != null)
        {
            _logger.LogInformation("[ExternalLogin] Utilizador encontrado com login externo existente - ID: {UserId}", user.Id);
            
            user.UpdateLastLogin(ip);
            await _userManager.UpdateAsync(user);
            await CreateLoginSessionAsync(user, ip, userAgent, deviceFingerprint, ct);
            
            // CORRIGIDO: Verificar se já tem refresh token válido
            bool needsNewRefreshToken = string.IsNullOrEmpty(user.RefreshToken) || 
                                         !user.RefreshTokenExpires.HasValue || 
                                         user.RefreshTokenExpires.Value < DateTime.UtcNow;
            
            TokenResponse tokens;
            
            if (needsNewRefreshToken)
            {
                // Gerar novos tokens (access + refresh)
                tokens = await GenerateTokensAsync(user, ct);
                _logger.LogInformation("[Auth] Novos tokens gerados no login externo - UserId: {UserId}", user.Id);
            }
            else
            {
                // Reutilizar refresh token existente, gerar apenas novo access token
                tokens = new TokenResponse
                {
                    AccessToken = await GenerateAccessTokenAsync(user),
                    RefreshToken = user.RefreshToken!,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(int.Parse(_config["Jwt:ExpiryMinutes"] ?? "60")),
                    TokenType = "Bearer"
                };
                _logger.LogInformation("[Auth] Refresh token reutilizado no login externo - UserId: {UserId}, Expira: {Expires}", 
                    user.Id, user.RefreshTokenExpires.Value);
            }
            
            _logger.LogInformation("[Auth] Login externo bem-sucedido utilizador={UserId} ip={IP}", user.Id, ip);
            return (AuthResult.SuccessResult(tokens, MapToUserProfile(user), "Login realizado com sucesso"), tokens);
        }

        _logger.LogInformation("[ExternalLogin] Procurando utilizador existente por email...");
        
        // Verificar se já existe um utilizador com este email
        user = await _userManager.FindByEmailAsync(email);
        
        if (user != null)
        {
            _logger.LogInformation("[ExternalLogin] Utilizador encontrado por email - ID: {UserId}, associando login externo...", user.Id);
            
            // Associar o login externo ao utilizador existente
            var addLoginResult = await _userManager.AddLoginAsync(user, externalLoginInfo);
            if (!addLoginResult.Succeeded)
            {
                _logger.LogWarning("[ExternalLogin] Falha ao associar login externo utilizador={UserId} provider={Provider} errors={Errors}", 
                    user.Id, externalLoginInfo.LoginProvider, string.Join(';', addLoginResult.Errors.Select(e => e.Code)));
                return (AuthResult.ErrorResult("Erro ao associar conta externa."), null);
            }

            _logger.LogInformation("[ExternalLogin] Login externo associado com sucesso!");

            // Atualizar avatar se não tiver ou se o Google forneceu uma nova imagem
            if (!string.IsNullOrEmpty(picture) && 
                (string.IsNullOrEmpty(user.AvatarUrl) || user.AvatarUrl != picture))
            {
                user.AvatarUrl = picture;
                await _userManager.UpdateAsync(user);
                _logger.LogInformation("[ExternalLogin] Avatar atualizado para o utilizador");
            }

            // Atualizar nome se não tiver
            if (string.IsNullOrEmpty(user.FullName) && !string.IsNullOrEmpty(name))
            {
                user.FullName = name.Trim();
                await _userManager.UpdateAsync(user);
                _logger.LogInformation("[ExternalLogin] Nome completo atualizado para o utilizador");
            }

            user.UpdateLastLogin(ip);
            await _userManager.UpdateAsync(user);
            await CreateLoginSessionAsync(user, ip, userAgent, deviceFingerprint, ct);
            
            // CORRIGIDO: Verificar se já tem refresh token válido
            bool needsNewRefreshToken = string.IsNullOrEmpty(user.RefreshToken) || 
                                         !user.RefreshTokenExpires.HasValue || 
                                         user.RefreshTokenExpires.Value < DateTime.UtcNow;
            
            TokenResponse tokens;
            
            if (needsNewRefreshToken)
            {
                // Gerar novos tokens (access + refresh)
                tokens = await GenerateTokensAsync(user, ct);
                _logger.LogInformation("[Auth] Novos tokens gerados ao associar login externo - UserId: {UserId}", user.Id);
            }
            else
            {
                // Reutilizar refresh token existente, gerar apenas novo access token
                tokens = new TokenResponse
                {
                    AccessToken = await GenerateAccessTokenAsync(user),
                    RefreshToken = user.RefreshToken!,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(int.Parse(_config["Jwt:ExpiryMinutes"] ?? "60")),
                    TokenType = "Bearer"
                };
                _logger.LogInformation("[Auth] Refresh token reutilizado ao associar login externo - UserId: {UserId}, Expira: {Expires}", 
                    user.Id, user.RefreshTokenExpires.Value);
            }
            
            _logger.LogInformation("[ExternalLogin] Login externo associado utilizador={UserId} provider={Provider}", user.Id, externalLoginInfo.LoginProvider);
            return (AuthResult.SuccessResult(tokens, MapToUserProfile(user), "Login realizado com sucesso"), tokens);
        }

        _logger.LogInformation("[ExternalLogin] Criando novo utilizador...");

        // Criar novo utilizador
        var fullName = !string.IsNullOrEmpty(name) ? name.Trim() : $"{givenName} {surname}".Trim();
        if (string.IsNullOrEmpty(fullName))
        {
            fullName = email.Split('@')[0]; // Fallback para parte do email antes do @
        }

        _logger.LogInformation("[ExternalLogin] Dados do novo utilizador - Email: {Email}, FullName: {FullName}", email, fullName);

        user = new User
        {
            UserName = email.ToLowerInvariant(),
            Email = email.ToLowerInvariant(),
            FullName = fullName,
            AvatarUrl = picture,
            AccountStatus = AccountStatus.Active, // Conta externa já é considerada verificada
            EmailConfirmed = true, // Email já verificado pelo provider externo
            CreatedAt = DateTime.UtcNow,
            TokenIdentifier = Guid.NewGuid().ToString()
        };

        var createResult = await _userManager.CreateAsync(user);
        if (!createResult.Succeeded)
        {
            _logger.LogWarning("[ExternalLogin] Falha ao criar utilizador externo email={Email} provider={Provider} errors={Errors}", 
                email, externalLoginInfo.LoginProvider, string.Join(';', createResult.Errors.Select(e => e.Code)));
            return (AuthResult.ErrorResult(createResult.Errors.Select(e => e.Description).ToArray()), null);
        }

        _logger.LogInformation("[ExternalLogin] Utilizador criado com sucesso - ID: {UserId}", user.Id);

        var addLoginResult2 = await _userManager.AddLoginAsync(user, externalLoginInfo);
        if (!addLoginResult2.Succeeded)
        {
            _logger.LogWarning("[ExternalLogin] Falha ao associar login externo ao novo utilizador utilizador={UserId} provider={Provider} errors={Errors}", 
                user.Id, externalLoginInfo.LoginProvider, string.Join(';', addLoginResult2.Errors.Select(e => e.Code)));
            
            // Limpar utilizador criado em caso de erro
            await _userManager.DeleteAsync(user);
            return (AuthResult.ErrorResult("Erro ao criar conta externa."), null);
        }

        _logger.LogInformation("[ExternalLogin] Login externo associado ao novo utilizador");

        user.UpdateLastLogin(ip);
        await _userManager.UpdateAsync(user);
        await CreateLoginSessionAsync(user, ip, userAgent, deviceFingerprint, ct);
        var newUserTokens = await GenerateTokensAsync(user, ct);
        _logger.LogInformation("[ExternalLogin] Novo utilizador criado com login externo utilizador={UserId} provider={Provider}", user.Id, externalLoginInfo.LoginProvider);
        return (AuthResult.SuccessResult(newUserTokens, MapToUserProfile(user), "Conta criada com sucesso"), newUserTokens);
    }

    public async Task<AuthResult> LogoutAsync(string userId, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            _logger.LogInformation("[Auth] Logout solicitado para utilizador inexistente userId={UserId}", userId);
            return AuthResult.SuccessResult(new TokenResponse(), new UserProfile(), "Logout efetuado");
        }
        user.RefreshToken = null;
        user.RefreshTokenExpires = null;
        await _userManager.UpdateAsync(user);

        var sessions = await _context.UserLoginSessions.Where(s => s.UserId == userId && s.IsActive).ToListAsync(ct);
        foreach (var s in sessions)
        {
            s.IsActive = false;
            s.LogoutAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("[Auth] Logout concluído utilizador={UserId}", user.Id);
        return AuthResult.SuccessResult(new TokenResponse(), MapToUserProfile(user), "Logout realizado com sucesso");
    }

    public async Task<(TokenResponse? tokens, AuthResult result)> RefreshAsync(string refreshToken, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            _logger.LogWarning("[Auth] Refresh token vazio ou nulo");
            return (null, AuthResult.ErrorResult("Token inválido"));
        }
        
        var user = await _userManager.Users.FirstOrDefaultAsync(u => u.RefreshToken == refreshToken, ct);
        if (user == null)
        {
            _logger.LogWarning("[Auth] Refresh token não encontrado na base de dados");
            return (null, AuthResult.ErrorResult("Token inválido"));
        }
        
        if (user.RefreshTokenExpires < DateTime.UtcNow)
        {
            _logger.LogWarning("[Auth] Refresh token expirado - UserId: {UserId}, Expirado em: {Expires}", 
                user.Id, user.RefreshTokenExpires);
            return (null, AuthResult.ErrorResult("Token expirado"));
        }
        
        // Manter o mesmo refresh token - apenas gerar novo access token
        var tokens = new TokenResponse
        {
            AccessToken = await GenerateAccessTokenAsync(user),
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(int.Parse(_config["Jwt:ExpiryMinutes"] ?? "60")),
            TokenType = "Bearer"
        };
        
        _logger.LogInformation("[Auth] Token renovado com sucesso - UserId: {UserId}", user.Id);
        return (tokens, AuthResult.SuccessResult(tokens, MapToUserProfile(user), "Token atualizado"));
    }

    public async Task<AuthResult> ChangePasswordAsync(string userId, ChangePasswordRequest request, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
        {
            _logger.LogWarning("[Auth] Alteração de password - utilizador não encontrado userId={UserId}", userId);
            return AuthResult.ErrorResult("Usuário não encontrado");
        }
        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            _logger.LogWarning("[Auth] Falha alteração password utilizador={UserId} errors={Errors}", user.Id, string.Join(';', result.Errors.Select(e => e.Code)));
            return AuthResult.ErrorResult(result.Errors.Select(e => e.Description).ToArray());
        }
        user.PasswordChangedAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);
        _logger.LogInformation("[Auth] Password alterada utilizador={UserId}", user.Id);
        return AuthResult.SuccessResult(new TokenResponse(), MapToUserProfile(user), "Senha alterada");
    }

    private async Task<TokenResponse> GenerateTokensAsync(User user, CancellationToken ct)
    {
        var accessToken = await GenerateAccessTokenAsync(user);
        var refreshToken = GenerateRefreshToken();
        
        // Refresh token válido por 2 dias
        var expiryDate = DateTime.UtcNow.AddDays(2);
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpires = expiryDate;
        await _userManager.UpdateAsync(user);

        _logger.LogInformation("[Auth] Novos tokens gerados - UserId: {UserId}, Expira: {Expiry}", 
            user.Id, expiryDate);

        return new TokenResponse
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(int.Parse(_config["Jwt:ExpiryMinutes"] ?? "60")),
            TokenType = "Bearer"
        };
    }

    private async Task<string> GenerateAccessTokenAsync(User user)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new("user_id", user.Id),
            new("email_verified", user.IsEmailVerified.ToString()),
            new("account_status", user.AccountStatus.ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:SecretKey"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddMinutes(int.Parse(_config["Jwt:ExpiryMinutes"] ?? "60"));

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: expiry,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes);
    }

    public async Task CreateLoginSessionAsync(User user, string? ip, string? userAgent, string? deviceFingerprint = null, CancellationToken ct = default)
    {
        var utcNow = DateTime.UtcNow;
        var normalizedUserAgent = userAgent ?? "Unknown";
        
        // NOVA LÓGICA: Verificar se já existe uma sessão ativa do mesmo dispositivo usando fingerprint
        // Se não houver fingerprint, usar IP + UserAgent como fallback (comportamento antigo)
        UserLoginSession? existingSession = null;
        
        if (!string.IsNullOrEmpty(deviceFingerprint))
        {
            // Procurar por fingerprint do dispositivo (método preferido)
            existingSession = await _context.UserLoginSessions
                .Where(s => s.UserId == user.Id 
                         && s.DeviceFingerprint == deviceFingerprint
                         && s.ExpiresAt > utcNow)
                .FirstOrDefaultAsync(ct);
        }
        else
        {
            // Fallback: usar IP + UserAgent (comportamento antigo)
            existingSession = await _context.UserLoginSessions
                .Where(s => s.UserId == user.Id 
                         && s.IpAddress == ip 
                         && s.UserAgent == normalizedUserAgent
                         && s.ExpiresAt > utcNow)
                .FirstOrDefaultAsync(ct);
        }
        
        if (existingSession != null)
        {
            // Atualizar sessão existente do mesmo dispositivo
            existingSession.LastActivity = utcNow;
            existingSession.ExpiresAt = utcNow.AddDays(30);
            existingSession.IpAddress = ip; // Atualizar IP (pode mudar)
            existingSession.UserAgent = normalizedUserAgent; // Atualizar UserAgent (pode mudar)
            
            await _context.SaveChangesAsync(ct);
            _logger.LogInformation("[Auth] Login session updated userId={UserId} sessionId={SessionId} fingerprint={Fingerprint}", 
                user.Id, existingSession.Id, deviceFingerprint ?? "none");
        }
        else
        {
            // Criar nova sessão para novo dispositivo
            var session = new UserLoginSession
            {
                UserId = user.Id,
                SessionToken = Guid.NewGuid().ToString(),
                IpAddress = ip,
                UserAgent = normalizedUserAgent,
                DeviceFingerprint = deviceFingerprint,
                LoginAt = utcNow,
                LastActivity = utcNow,
                ExpiresAt = utcNow.AddDays(30)
            };
            _context.UserLoginSessions.Add(session);
            await _context.SaveChangesAsync(ct);
            _logger.LogInformation("[Auth] Login session created userId={UserId} ip={IP} fingerprint={Fingerprint}", 
                user.Id, ip, deviceFingerprint ?? "none");
        }
    }

    private async Task SendEmailConfirmationAsync(User user, string token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(user.Email))
        {
            _logger.LogWarning("[Auth] Tentativa de envio de confirmação sem email userId={UserId}", user.Id);
            return;
        }

        try
        {
            // Usar WebEncoders (biblioteca oficial Microsoft) para encoding URL-safe
            var urlSafeToken = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(
                System.Text.Encoding.UTF8.GetBytes(token)
            );
            
            _logger.LogInformation("[Auth] Token gerado - Original length: {OrigLen}, URL-safe length: {SafeLen}", 
                token.Length, urlSafeToken.Length);
            
            // URL aponta para o FRONTEND que irá validar via API
            var frontendUrl = Environment.GetEnvironmentVariable("APP_FRONTEND_URL") 
                           ?? _config["App:FrontendUrl"] 
                           ?? "http://localhost:5173";
            
            var confirmLink = $"{frontendUrl}/confirm-email/{urlSafeToken}";
            
            _logger.LogInformation("[Auth] Enviando email de confirmação para={Email} frontendUrl={FrontendUrl}", 
                user.Email, frontendUrl);
            
            var emailSent = await _emailService.SendTemplateEmailAsync(
                "email-confirmation", 
                user.Email, 
                new { UserName = user.FullName, ConfirmationLink = confirmLink },
                ct
            );

            if (!emailSent)
            {
                _logger.LogError("[Auth] Falha ao enviar email de confirmação userId={UserId}", user.Id);
            }
            else
            {
                _logger.LogInformation("[Auth] Email de confirmação enviado com sucesso userId={UserId}", user.Id);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Auth] Exceção ao enviar email de confirmação userId={UserId}", user.Id);
        }
    }

    private static UserProfile MapToUserProfile(User user) => new()
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
}
