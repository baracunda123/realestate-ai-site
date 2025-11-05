using System.Threading.RateLimiting;
using realestate_ia_site.Server.Infrastructure.AI;
using realestate_ia_site.Server.Infrastructure.Auth;
using realestate_ia_site.Server.Infrastructure.Chat;
using realestate_ia_site.Server.Infrastructure.Configurations;
using realestate_ia_site.Server.Infrastructure.Events;
using realestate_ia_site.Server.Infrastructure.ExternalServices;
using realestate_ia_site.Server.Infrastructure.Notifications;
using realestate_ia_site.Server.Infrastructure.Payments;
using realestate_ia_site.Server.Infrastructure.Scraper;
using realestate_ia_site.Server.Infrastructure.Storage;
using realestate_ia_site.Server.Infrastructure.BackgroundServices;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using realestate_ia_site.Server.Application.Features.Payments.Interfaces;
using realestate_ia_site.Server.Application.Features.Payments;
using realestate_ia_site.Server.Application.Notifications.Interfaces;
using realestate_ia_site.Server.Application.Chat.Interfaces;
using realestate_ia_site.Server.Application.ExternalServices.Interfaces;
using realestate_ia_site.Server.Application.Common.Events;
using realestate_ia_site.Server.Application.Security;
using realestate_ia_site.Server.Domain.Events;
using realestate_ia_site.Server.Application.Features.Properties.Search.Filters;

namespace realestate_ia_site.Server.Infrastructure.Extensions;

/// <summary>
/// Extension methods for configuring infrastructure services
/// </summary>
public static class InfrastructureServicesExtensions
{
    public static IServiceCollection AddInfrastructureServices(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        // Security
        services.AddHttpContextAccessor();
        services.AddSingleton<SecurityAuditService>();

        // Enhanced Rate Limiter
        services.AddRateLimiter(options =>
        {
            var isDevelopment = environment.IsDevelopment();
            
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
            
            // Auth rate limiting - MUITO MAIS FRIENDLY
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

        // File Storage
        AddFileStorageServices(services, configuration, environment);

        // Geocoding
        AddGeocodingServices(services, configuration);

        // AI Services
        services.AddSingleton<IOpenAIService, OpenAIService>();
        services.AddScoped<IPropertyFilterInterpreter, PropertyFilterInterpreter>();
        services.AddScoped<IPropertyResponseGenerator, PropertyResponseGenerator>();
        services.AddScoped<PropertyAIService>();
        services.AddScoped<LocationAIService>();
        services.AddScoped<IConversationContextService, ConversationContextService>();

        // Chat & Quota
        services.AddScoped<IChatUsageService, ChatUsageService>();

        // Configurations
        services.AddSingleton<StripeOptions>();
        services.Configure<ScraperOptions>(configuration.GetSection(ScraperOptions.SectionName));

        // Payments
        services.AddScoped<ISubscriptionService, SubscriptionService>();
        services.AddScoped<IWebhookService, WebhookService>();
        services.AddScoped<PaymentWebhookHandler>();

        // External Services
        services.AddScoped<GoogleMapsService>();
        services.AddScoped<ScraperStateProvider>();

        // Property Filters
        AddPropertyFilters(services);

        // Notifications
        services.Configure<EmailConfiguration>(configuration.GetSection("Email"));
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<IRealtimeNotificationService, RealtimeNotificationService>();

        // SignalR
        services.AddSignalR(options =>
        {
            options.EnableDetailedErrors = environment.IsDevelopment();
            options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
            options.KeepAliveInterval = TimeSpan.FromSeconds(15);
            options.HandshakeTimeout = TimeSpan.FromSeconds(15);
            options.MaximumReceiveMessageSize = 32 * 1024;
        });

        // Domain Events
        services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();
        services.AddScoped<IDomainEventHandler<PropertyPriceChangedEvent>, PropertyAlertEventHandler>();
        services.AddScoped<IDomainEventHandler<FavoriteAddedEvent>, UserBehaviorEventHandler>();
        services.AddScoped<IDomainEventHandler<FavoriteRemovedEvent>, UserBehaviorEventHandler>();
        services.AddScoped<IDomainEventHandler<SearchExecutedEvent>, UserBehaviorEventHandler>();

        // Background Services
        services.AddHostedService<RecommendationBackgroundService>();
        services.AddHostedService<PropertyAlertBackgroundService>();

        return services;
    }

    private static void AddFileStorageServices(
        IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        if (environment.IsProduction())
        {
            var azureStorageConnectionString = Environment.GetEnvironmentVariable("AZURE_STORAGE_CONNECTION_STRING")
                                              ?? configuration["Azure:Storage:ConnectionString"];
            if (!string.IsNullOrEmpty(azureStorageConnectionString))
            {
                services.AddSingleton<IFileStorageService, AzureBlobStorageService>();
                Console.WriteLine("Using Azure Blob Storage");
            }
            else
            {
                services.AddScoped<IFileStorageService, LocalFileStorageService>();
                Console.WriteLine("WARNING: Using local storage in production");
            }
        }
        else
        {
            services.AddScoped<IFileStorageService, LocalFileStorageService>();
            Console.WriteLine("Using Local Storage (Development)");
        }
    }

    private static void AddGeocodingServices(IServiceCollection services, IConfiguration configuration)
    {
        var geocodingProvider = Environment.GetEnvironmentVariable("GEOCODING_PROVIDER")
                               ?? configuration["Geocoding:Provider"]
                               ?? "Mapbox";

        if (geocodingProvider.Equals("GoogleMaps", StringComparison.OrdinalIgnoreCase))
        {
            services.AddScoped<IGeocodingService, GoogleMapsService>();
            services.AddHttpClient<GoogleMapsService>();
            Console.WriteLine("Using Google Maps Geocoding");
        }
        else
        {
            services.AddScoped<IGeocodingService, MapboxGeocodingService>();
            services.AddHttpClient<MapboxGeocodingService>();
            Console.WriteLine("Using Mapbox Geocoding");
        }
    }

    private static void AddPropertyFilters(IServiceCollection services)
    {
        services.AddScoped<IPropertyFilter, TypeFilter>();
        services.AddScoped<IPropertyFilter, LocationFilter>();
        services.AddScoped<IPropertyFilter, PriceFilter>();
        services.AddScoped<IPropertyFilter, TargetPriceFilter>();
        services.AddScoped<IPropertyFilter, AreaFilter>();
        services.AddScoped<IPropertyFilter, TargetAreaFilter>();
        services.AddScoped<IPropertyFilter, RoomsFilter>();
        services.AddScoped<IPropertyFilter, TagsFilter>();
        services.AddScoped<IPropertyFilter, SortFilter>();
        services.AddScoped<IPropertyFilter, TopPicksFilter>();
    }
}
