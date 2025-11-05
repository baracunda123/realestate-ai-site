namespace realestate_ia_site.Server.Infrastructure.Extensions;

/// <summary>
/// Extension methods for configuring API services
/// </summary>
public static class ApiExtensions
{
    /// <summary>
    /// Adds API services (Controllers, Swagger, CORS)
    /// </summary>
    public static IServiceCollection AddApiServices(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        // Controllers
        services.AddControllers();
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();

        // CORS
        var allowedOrigins = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS")?.Split(',')
                            ?? (environment.IsDevelopment()
                                ? new[] { "https://localhost:64222" }
                                : new[] {
                                    "https://www.resideai.pt",
                                    "https://resideai.pt",
                                    "https://ambitious-pond-01734cc0f.2.azurestaticapps.net"
                                });

        services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.WithOrigins(allowedOrigins)
                      .AllowCredentials()
                      .AllowAnyMethod()
                      .WithHeaders("Content-Type", "Authorization", "X-Session-ID", "X-Requested-With")
                      .WithExposedHeaders("X-Total-Count", "X-Page-Count", "X-New-Access-Token", "X-Token-Expires-At")
                      .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
            });
        });

        return services;
    }
}
