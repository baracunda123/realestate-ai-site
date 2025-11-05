using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Infrastructure.Persistence;

namespace realestate_ia_site.Server.Infrastructure.Extensions;

/// <summary>
/// Extension methods for configuring authentication and authorization
/// </summary>
public static class AuthenticationExtensions
{
    /// <summary>
    /// Adds Identity and JWT authentication services
    /// </summary>
    public static IServiceCollection AddAuthenticationServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Get JWT configuration from environment or appsettings
        var jwtSecretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
                           ?? configuration["Jwt:SecretKey"]
                           ?? throw new InvalidOperationException(
                               "JWT Secret Key must be configured via environment variable JWT_SECRET_KEY or appsettings");

        var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER")
                        ?? configuration["Jwt:Issuer"]
                        ?? "RealEstateAI";

        var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
                          ?? configuration["Jwt:Audience"]
                          ?? "RealEstateAI-Client";

        // Configure Identity with enhanced security
        services.AddIdentity<User, IdentityRole>(options =>
        {
            // Password Policy - Enhanced
            options.Password.RequireDigit = true;
            options.Password.RequireLowercase = true;
            options.Password.RequireUppercase = true;
            options.Password.RequireNonAlphanumeric = true;
            options.Password.RequiredLength = 8;
            options.Password.RequiredUniqueChars = 4;

            // Lockout Policy - Enhanced
            options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            options.Lockout.MaxFailedAccessAttempts = 5;
            options.Lockout.AllowedForNewUsers = true;

            // User Policy
            options.User.RequireUniqueEmail = true;
            options.User.AllowedUserNameCharacters = 
                "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";

            // Sign In Policy
            options.SignIn.RequireConfirmedEmail = true;
            options.SignIn.RequireConfirmedPhoneNumber = false;
        })
        .AddEntityFrameworkStores<ApplicationDbContext>()
        .AddDefaultTokenProviders();

        // Configure JWT Authentication
        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = "Bearer";
            options.DefaultChallengeScheme = "Bearer";
            options.DefaultScheme = "Bearer";
        })
        .AddJwtBearer("Bearer", options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = jwtIssuer,
                ValidAudience = jwtAudience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretKey)),
                ClockSkew = TimeSpan.Zero,
                RequireExpirationTime = true,
                RequireSignedTokens = true
            };

            options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
            {
                OnAuthenticationFailed = context =>
                {
                    var logger = context.HttpContext.RequestServices
                        .GetRequiredService<ILogger<Program>>();
                    logger.LogWarning(
                        "JWT Authentication failed: {Message} | Path: {Path} | IP: {IP}",
                        context.Exception.Message,
                        context.HttpContext.Request.Path,
                        context.HttpContext.Connection.RemoteIpAddress);
                    return Task.CompletedTask;
                },
                OnTokenValidated = context =>
                {
                    var logger = context.HttpContext.RequestServices
                        .GetRequiredService<ILogger<Program>>();
                    logger.LogDebug("JWT Token validated for user: {User}",
                        context.Principal?.Identity?.Name);
                    return Task.CompletedTask;
                }
            };
        });

        // Configure Authorization
        services.AddAuthorization();

        return services;
    }
}
