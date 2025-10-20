using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;

using realestate_ia_site.Server.Application.SearchAI;
using realestate_ia_site.Server.Application.PropertyAlerts;
using realestate_ia_site.Server.Application.PropertySearch;
using realestate_ia_site.Server.Application.Recommendations;
using realestate_ia_site.Server.Application.AI.Interfaces;
using realestate_ia_site.Server.Application.Payments.Interfaces;
using realestate_ia_site.Server.Application.Payments;
using realestate_ia_site.Server.Application.Notifications.Interfaces;
using realestate_ia_site.Server.Application.Common.Events;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Domain.Events;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Infrastructure.AI;
using realestate_ia_site.Server.Infrastructure.Persistence;
using realestate_ia_site.Server.Infrastructure.Persistence.Filters;
using realestate_ia_site.Server.Infrastructure.ExternalServices;
using realestate_ia_site.Server.Infrastructure.Scraper;
using realestate_ia_site.Server.Middleware;
using realestate_ia_site.Server.Infrastructure.Notifications;
using realestate_ia_site.Server.Infrastructure.Events;
using realestate_ia_site.Server.Infrastructure.Payments;
using realestate_ia_site.Server.Infrastructure.Configurations;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Auth;
using realestate_ia_site.Server.Application.PropertySearch.Filters;
using realestate_ia_site.Server.Application.Security;
using realestate_ia_site.Server.Infrastructure.BackgroundServices;
using realestate_ia_site.Server.Infrastructure.Storage;

var builder = WebApplication.CreateBuilder(args);

// AZURE: Configure paths for Azure App Service
if (builder.Environment.IsProduction())
{
    var contentRoot = Directory.GetCurrentDirectory();
    var webRoot = Path.Combine(contentRoot, "wwwroot");
    
    builder.Configuration.SetBasePath(contentRoot);
    
    // Ensure wwwroot exists in production
    if (!Directory.Exists(webRoot))
    {
        try
        {
            Directory.CreateDirectory(webRoot);
            Console.WriteLine($"Created wwwroot directory: {webRoot}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Warning: Could not create wwwroot directory: {ex.Message}");
        }
    }
}

// AZURE: Enhanced logging configuration for Azure App Service
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// SECURITY: Load environment variables for production
if (builder.Environment.IsProduction())
{
    builder.Configuration.AddEnvironmentVariables();
}

// SECURITY: Get JWT secret from environment or configuration
var jwtSecretKey = Environment.GetEnvironmentVariable("JWT_SECRET_KEY")
                   ?? builder.Configuration["Jwt:SecretKey"]
                   ?? throw new InvalidOperationException("JWT Secret Key must be configured via environment variable JWT_SECRET_KEY or appsettings");

var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER")
                ?? builder.Configuration["Jwt:Issuer"]
                ?? "RealEstateAI";

var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE")
                  ?? builder.Configuration["Jwt:Audience"]
                  ?? "RealEstateAI-Client";

// Identity with enhanced security
builder.Services.AddIdentity<User, IdentityRole>(options =>
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
    options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";

    // Sign In Policy
    options.SignIn.RequireConfirmedEmail = true;
    options.SignIn.RequireConfirmedPhoneNumber = false;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// Authentication / JWT with enhanced security
builder.Services.AddAuthentication(options =>
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
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogWarning("JWT Authentication failed: {Message} | Path: {Path} | IP: {IP}",
                context.Exception.Message,
                context.HttpContext.Request.Path,
                context.HttpContext.Connection.RemoteIpAddress);
            return Task.CompletedTask;
        },
        OnTokenValidated = context =>
        {
            var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
            logger.LogDebug("JWT Token validated for user: {User}", context.Principal?.Identity?.Name);
            return Task.CompletedTask;
        }
    };

    // SIGNALR: JWT Authentication para hubs
    options.Events.OnMessageReceived = context =>
    {
        var accessToken = context.Request.Query["access_token"];

        // Se é request para hub SignalR
        var path = context.HttpContext.Request.Path;
        if (!string.IsNullOrEmpty(accessToken) && 
            path.StartsWithSegments("/hubs"))
        {
            context.Token = accessToken;
        }

        return Task.CompletedTask;
    };
});

// Enhanced Rate Limiter
builder.Services.AddRateLimiter(options =>
{
    var isDevelopment = builder.Environment.IsDevelopment();
    
    // General API rate limiting
    options.AddPolicy("ApiPolicy", ctx => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = isDevelopment ? 500 : 100, // 5x mais em dev
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = isDevelopment ? 50 : 10 // Mais queue em dev
        }));

    // ✅ Auth rate limiting - MUITO MAIS FRIENDLY
    options.AddPolicy("AuthPolicy", ctx => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = isDevelopment ? 50 : 20, // 50 tentativas/min em dev, 20 em prod
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = isDevelopment ? 10 : 5 // Permite queue em dev
        }));

    // Payment rate limiting
    options.AddPolicy("PaymentPolicy", ctx => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = isDevelopment ? 100 : 20, // 5x mais em dev
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = isDevelopment ? 20 : 5
        }));

    // Search rate limiting
    options.AddPolicy("SearchPolicy", ctx => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = isDevelopment ? 200 : 30, // Muito mais generoso em dev
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = isDevelopment ? 50 : 10
        }));

    options.OnRejected = async (context, token) =>
    {
        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogWarning("Rate limit exceeded for {Path} from IP {IP} | UserAgent: {UserAgent}",
            context.HttpContext.Request.Path,
            context.HttpContext.Connection.RemoteIpAddress,
            context.HttpContext.Request.Headers.UserAgent.FirstOrDefault());

        context.HttpContext.Response.StatusCode = 429;
        
        var retryAfter = isDevelopment ? "10" : "60";
        context.HttpContext.Response.Headers.Add("Retry-After", retryAfter);
        
        await context.HttpContext.Response.WriteAsync(
            isDevelopment 
                ? "🐢 Calma aí! Aguarda 10 segundos e tenta de novo." 
                : "Rate limit exceeded. Please try again later.", 
            token);
    };
});

// DbContext with secure connection string
var connectionString = Environment.GetEnvironmentVariable("DATABASE_CONNECTION_STRING")
                      ?? builder.Configuration.GetConnectionString("DefaultConnection")
                      ?? throw new InvalidOperationException("Database connection string must be configured");

builder.Services.AddDbContext<ApplicationDbContext>(opt =>
    opt.UseNpgsql(connectionString, options =>
    {
        options.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(30), errorCodesToAdd: null);
        options.CommandTimeout(30);
    }));
builder.Services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

// Security Services
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<SecurityAuditService>();

// FILE STORAGE: Configure based on environment
if (builder.Environment.IsProduction())
{
    // Check if Azure Storage is configured
    var azureStorageConnectionString = Environment.GetEnvironmentVariable("AZURE_STORAGE_CONNECTION_STRING")
                                      ?? builder.Configuration["Azure:Storage:ConnectionString"];
    
    if (!string.IsNullOrEmpty(azureStorageConnectionString))
    {
        builder.Services.AddSingleton<IFileStorageService, AzureBlobStorageService>();
        Console.WriteLine("Using Azure Blob Storage for file uploads");
    }
    else
    {
        builder.Services.AddScoped<IFileStorageService, LocalFileStorageService>();
        Console.WriteLine("WARNING: Azure Storage not configured - using local storage (not recommended for production)");
    }
}
else
{
    builder.Services.AddScoped<IFileStorageService, LocalFileStorageService>();
    Console.WriteLine("Using Local Storage for file uploads (Development)");
}

// Application services
builder.Services.AddScoped<SearchAIOrchestrator>();
builder.Services.AddScoped<PropertyAlertService>();
builder.Services.AddScoped<PropertyRecommendationService>();
builder.Services.AddScoped<IPropertySearchService, PropertySearchService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<GoogleAuthService>();

// AI
builder.Services.AddSingleton<IOpenAIService, OpenAIService>();
builder.Services.AddScoped<IPropertyFilterInterpreter, PropertyFilterInterpreter>();
builder.Services.AddScoped<IPropertyResponseGenerator, PropertyResponseGenerator>();
builder.Services.AddScoped<PropertyAIService>();
builder.Services.AddScoped<LocationAIService>();
builder.Services.AddScoped<IConversationContextService, ConversationContextService>();

// Configurations (Stripe ScraperOptions)
builder.Services.AddSingleton<StripeOptions>();
builder.Services.Configure<realestate_ia_site.Server.Configuration.ScraperOptions>(
    builder.Configuration.GetSection(realestate_ia_site.Server.Configuration.ScraperOptions.SectionName));

// Payments
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddScoped<IWebhookService, WebhookService>();
builder.Services.AddScoped<PaymentWebhookHandler>();
builder.Services.AddScoped<SubscriptionApplicationService>();

// Persistence / External
builder.Services.AddScoped<PropertyImportService>();
builder.Services.AddScoped<GoogleMapsService>();
builder.Services.AddScoped<ScraperStateProvider>();
builder.Services.AddMemoryCache();

builder.Services.AddHttpClient<GoogleMapsService>();

// Property Filters
builder.Services.AddScoped<IPropertyFilter, TypeFilter>();
builder.Services.AddScoped<IPropertyFilter, LocationFilter>();
builder.Services.AddScoped<IPropertyFilter, PriceFilter>();
builder.Services.AddScoped<IPropertyFilter, RoomsFilter>();
builder.Services.AddScoped<IPropertyFilter, TagsFilter>();
builder.Services.AddScoped<IPropertyFilter, SortFilter>();
builder.Services.AddScoped<IPropertyFilter, TopPicksFilter>();

// Notifications
builder.Services.Configure<EmailConfiguration>(builder.Configuration.GetSection("Email"));
builder.Services.AddScoped<IEmailService, EmailService>();

// SIGNALR: Serviço de notificações em tempo real
builder.Services.AddScoped<IRealtimeNotificationService, RealtimeNotificationService>();

// SIGNALR: Configuração do SignalR com autenticação
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.HandshakeTimeout = TimeSpan.FromSeconds(15);
    options.MaximumReceiveMessageSize = 32 * 1024; // 32KB
});

// Domain events
builder.Services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();
builder.Services.AddScoped<IDomainEventHandler<PropertyPriceChangedEvent>, PropertyAlertEventHandler>();

// NOVOS EVENT HANDLERS PARA RECOMENDAÇÕES INTELIGENTES
builder.Services.AddScoped<IDomainEventHandler<FavoriteAddedEvent>, UserBehaviorEventHandler>();
builder.Services.AddScoped<IDomainEventHandler<SavedSearchCreatedEvent>, UserBehaviorEventHandler>();
builder.Services.AddScoped<IDomainEventHandler<SearchExecutedEvent>, UserBehaviorEventHandler>();

// BACKGROUND SERVICES PARA RECOMENDAÇÕES PROATIVAS
builder.Services.AddHostedService<RecommendationBackgroundService>();

// BACKGROUND SERVICES PARA ALERTAS DE PROPRIEDADES
builder.Services.AddHostedService<PropertyAlertBackgroundService>();

// API basics
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Enhanced CORS
var allowedOrigins = Environment.GetEnvironmentVariable("ALLOWED_ORIGINS")?.Split(',')
                    ?? (builder.Environment.IsDevelopment()
                        ? new[] { "https://localhost:64222" }
                        : new[] {
                            "https://www.resideai.pt",                                      // ⭐ Novo domínio customizado
                            "https://resideai.pt",                                          // ⭐ Root domain (opcional)
                            "https://ambitious-pond-01734cc0f.2.azurestaticapps.net"        // ⭐ Manter Azure domain como fallback
                        });

builder.Services.AddCors(options =>
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

var app = builder.Build();

// AZURE: Add startup logging with enhanced console output
Console.WriteLine("=== APPLICATION STARTUP ===");
Console.WriteLine($"Environment: {app.Environment.EnvironmentName}");
Console.WriteLine($"Machine: {Environment.MachineName}");
Console.WriteLine($"ContentRootPath: {app.Environment.ContentRootPath}");
Console.WriteLine($"WebRootPath: {app.Environment.WebRootPath ?? "NULL"}");

try
{
    var startupLogger = app.Services.GetRequiredService<ILogger<Program>>();
    startupLogger.LogInformation("🚀 Application starting up | Environment: {Environment} | Version: {Version}",
        app.Environment.EnvironmentName,
        typeof(Program).Assembly.GetName().Version?.ToString() ?? "Unknown");
}
catch (Exception ex)
{
    Console.WriteLine($"Failed to get startup logger: {ex.Message}");
}

// Enhanced Security headers
app.Use(async (context, next) =>
{
    var enableSecurityHeaders = Environment.GetEnvironmentVariable("ENABLE_SECURITY_HEADERS")?.ToLower() == "true"
                               || builder.Configuration.GetValue<bool>("Security:EnableSecurityHeaders", true);
    
    if (enableSecurityHeaders)
    {
        if (app.Environment.IsDevelopment())
        {
            context.Response.Headers.ContentSecurityPolicy =
                "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src 'self' https: http: ws: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;";
        }
        else
        {
            // More permissive for Google Auth in production
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

app.UseDefaultFiles();
app.UseStaticFiles();

// AZURE FIX: Configure uploads directory only if WebRootPath is available
if (!string.IsNullOrEmpty(app.Environment.WebRootPath))
{
    var uploadsPath = Path.Combine(app.Environment.WebRootPath, "uploads");
    
    // Ensure uploads directory exists
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
    
    // Configure static files for uploaded content
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
        RequestPath = "/uploads",
        OnPrepareResponse = ctx =>
        {
            // Set cache headers for uploaded files
            ctx.Context.Response.Headers.CacheControl = "public,max-age=604800"; // 7 days
            
            // Add security headers for images
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Global exception handling should be early in the pipeline
app.UseGlobalExceptionHandling();

// CORS must come before authentication/authorization
app.UseCors();

// Security Middleware order is important
app.UseMiddleware<SessionMiddleware>();
app.UseMiddleware<SecurityMiddleware>();
app.UseMiddleware<TokenRefreshMiddleware>(); // NOVO: Renovação automática de token
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// AZURE: Health check endpoint
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "healthy",
    timestamp = DateTime.UtcNow,
    environment = app.Environment.EnvironmentName,
    version = typeof(Program).Assembly.GetName().Version?.ToString() ?? "Unknown"
})).AllowAnonymous();

// SIGNALR: Mapear hubs (DEPOIS da autenticação e autorização)
app.MapHub<NotificationHub>("/hubs/notifications");

if (!app.Environment.IsDevelopment())
{
    app.MapFallbackToFile("/index.html");
}

Console.WriteLine("APPLICATION READY");
app.Run();