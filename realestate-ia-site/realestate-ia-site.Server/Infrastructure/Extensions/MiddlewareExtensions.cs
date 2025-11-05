using realestate_ia_site.Server.Infrastructure.Middleware;
using realestate_ia_site.Server.Infrastructure.Notifications;

namespace realestate_ia_site.Server.Infrastructure.Extensions;

/// <summary>
/// Extension methods for configuring middleware pipeline
/// </summary>
public static class MiddlewareExtensions
{
    /// <summary>
    /// Configures the complete middleware pipeline
    /// </summary>
    public static WebApplication UseMiddlewarePipeline(
        this WebApplication app,
        IConfiguration configuration)
    {
        // Startup logging
        LogStartup(app);

        // Security headers
        app.UseSecurityHeaders(configuration);

        // Static files
        app.UseDefaultFiles();
        app.UseStaticFiles();
        app.ConfigureUploadsDirectory();

        // Swagger (Development only)
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        // Global exception handling
        app.UseGlobalExceptionHandling();

        // CORS
        app.UseCors();

        // Security & Auth middleware
        app.UseMiddleware<SessionMiddleware>();
        app.UseMiddleware<SecurityMiddleware>();
        app.UseMiddleware<TokenRefreshMiddleware>();
        app.UseRateLimiter();
        app.UseAuthentication();
        app.UseAuthorization();

        // Controllers
        app.MapControllers();

        // Health check
        app.MapGet("/api/health", () => Results.Ok(new
        {
            status = "healthy",
            timestamp = DateTime.UtcNow,
            environment = app.Environment.EnvironmentName,
            version = typeof(Program).Assembly.GetName().Version?.ToString() ?? "Unknown"
        })).AllowAnonymous();

        // SignalR Hubs (DEPOIS da autenticação e autorização)
        app.MapHub<NotificationHub>("/hubs/notifications");

        // Fallback to index.html (Production only)
        if (!app.Environment.IsDevelopment())
        {
            app.MapFallbackToFile("/index.html");
        }

        Console.WriteLine("APPLICATION READY");
        return app;
    }

    private static void LogStartup(WebApplication app)
    {
        Console.WriteLine("=== APPLICATION STARTUP ===");
        Console.WriteLine($"Environment: {app.Environment.EnvironmentName}");
        Console.WriteLine($"Machine: {Environment.MachineName}");
        Console.WriteLine($"ContentRootPath: {app.Environment.ContentRootPath}");
        Console.WriteLine($"WebRootPath: {app.Environment.WebRootPath ?? "NULL"}");

        try
        {
            var logger = app.Services.GetRequiredService<ILogger<Program>>();
            logger.LogInformation(
                "🚀 Application starting | Environment: {Environment} | Version: {Version}",
                app.Environment.EnvironmentName,
                typeof(Program).Assembly.GetName().Version?.ToString() ?? "Unknown");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to get startup logger: {ex.Message}");
        }
    }

    private static WebApplication UseSecurityHeaders(
        this WebApplication app,
        IConfiguration configuration)
    {
        app.Use(async (context, next) =>
        {
            var enableSecurityHeaders = Environment.GetEnvironmentVariable("ENABLE_SECURITY_HEADERS")?.ToLower() == "true"
                                       || configuration.GetValue<bool>("Security:EnableSecurityHeaders", true);

            if (enableSecurityHeaders)
            {
                if (app.Environment.IsDevelopment())
                {
                    context.Response.Headers.ContentSecurityPolicy =
                        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src 'self' https: http: ws: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;";
                }
                else
                {
                    context.Response.Headers.ContentSecurityPolicy =
                        "default-src 'self'; script-src 'self' https://accounts.google.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; img-src 'self' data: https:; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';";
                }

                context.Response.Headers.XContentTypeOptions = "nosniff";
                context.Response.Headers.XFrameOptions = "DENY";
                context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
                context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
                context.Response.Headers.Append("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()");

                if (!app.Environment.IsDevelopment())
                {
                    context.Response.Headers.Append("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
                }
            }

            await next();
        });

        return app;
    }

    private static WebApplication ConfigureUploadsDirectory(this WebApplication app)
    {
        if (!string.IsNullOrEmpty(app.Environment.WebRootPath))
        {
            var uploadsPath = Path.Combine(app.Environment.WebRootPath, "uploads");

            if (!Directory.Exists(uploadsPath))
            {
                try
                {
                    Directory.CreateDirectory(uploadsPath);
                    Console.WriteLine($"Created uploads directory: {uploadsPath}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to create uploads directory: {ex.Message}");
                }
            }

            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
                RequestPath = "/uploads",
                OnPrepareResponse = ctx =>
                {
                    ctx.Context.Response.Headers.CacheControl = "public,max-age=604800";

                    if (ctx.File.Name.EndsWith(".jpg", StringComparison.OrdinalIgnoreCase) ||
                        ctx.File.Name.EndsWith(".jpeg", StringComparison.OrdinalIgnoreCase) ||
                        ctx.File.Name.EndsWith(".png", StringComparison.OrdinalIgnoreCase) ||
                        ctx.File.Name.EndsWith(".gif", StringComparison.OrdinalIgnoreCase) ||
                        ctx.File.Name.EndsWith(".webp", StringComparison.OrdinalIgnoreCase))
                    {
                        ctx.Context.Response.Headers.ContentType = "image/*";
                    }
                }
            });
        }
        else
        {
            Console.WriteLine("WebRootPath is null - skipping uploads directory configuration");
        }

        return app;
    }
}
