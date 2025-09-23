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

var builder = WebApplication.CreateBuilder(args);

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
});

// Enhanced Rate Limiter
builder.Services.AddRateLimiter(options =>
{
    // General API rate limiting
    options.AddPolicy("ApiPolicy", ctx => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 100,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 10
        }));

    // Strict auth rate limiting
    options.AddPolicy("AuthPolicy", ctx => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 10,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0 // No queuing for auth
        }));

    // Payment rate limiting
    options.AddPolicy("PaymentPolicy", ctx => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 5
        }));

    // Search rate limiting
    options.AddPolicy("SearchPolicy", ctx => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 30,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 10
        }));

    options.OnRejected = async (context, token) =>
    {
        var logger = context.HttpContext.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogWarning("Rate limit exceeded for {Path} from IP {IP} | UserAgent: {UserAgent}",
            context.HttpContext.Request.Path,
            context.HttpContext.Connection.RemoteIpAddress,
            context.HttpContext.Request.Headers.UserAgent.FirstOrDefault());

        context.HttpContext.Response.StatusCode = 429;
        await context.HttpContext.Response.WriteAsync("Rate limit exceeded. Please try again later.", token);
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

// Application services
builder.Services.AddScoped<SearchAIOrchestrator>();
builder.Services.AddScoped<PropertyAlertService>();
builder.Services.AddScoped<PropertyRecommendationService>();
builder.Services.AddScoped<IPropertySearchService, PropertySearchService>();
builder.Services.AddScoped<AuthService>();

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

// Domain events
builder.Services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();
builder.Services.AddScoped<IDomainEventHandler<PropertyCreatedEvent>, PropertyAlertEventHandler>();
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
                            "https://residai-ezgzdjfrc9fdcfez.canadacentral-01.azurewebsites.net",
                            "https://residai-server.azurewebsites.net"
                        });

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowCredentials()
              .AllowAnyMethod()
              .WithHeaders("Content-Type", "Authorization", "X-Session-ID")
              .WithExposedHeaders("X-Total-Count", "X-Page-Count")
              .SetPreflightMaxAge(TimeSpan.FromMinutes(10));
    });
});

var app = builder.Build();

// AZURE: Add startup logging with enhanced console output
Console.WriteLine("=== APPLICATION STARTUP ===");
Console.WriteLine($"Environment: {app.Environment.EnvironmentName}");
Console.WriteLine($"Machine: {Environment.MachineName}");

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
    var enableSecurityHeaders = Environment.GetEnvironmentVariable("ENABLE_SECURITY_HEADERS") != "false";

    if (enableSecurityHeaders)
    {
        if (app.Environment.IsDevelopment())
        {
            context.Response.Headers.ContentSecurityPolicy =
                "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src 'self' https: http: ws: wss:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;";
        }
        else
        {
            context.Response.Headers.ContentSecurityPolicy =
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; img-src 'self' data: https:; font-src 'self' data:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';";
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Global exception handling should be early in the pipeline
app.UseGlobalExceptionHandling();

// Security Middleware order is important
app.UseMiddleware<SessionMiddleware>();
app.UseMiddleware<SecurityMiddleware>();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseCors();

app.MapControllers();

if (!app.Environment.IsDevelopment())
{
    app.MapFallbackToFile("/index.html");
}

Console.WriteLine("=== APPLICATION READY ===");
app.Run();