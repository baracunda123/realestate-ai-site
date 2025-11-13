using realestate_ia_site.Server.Application.Features.AI.SearchAI;
using realestate_ia_site.Server.Application.Features.Properties.Search;
using realestate_ia_site.Server.Application.Features.Properties.Import;
using realestate_ia_site.Server.Application.Features.Payments;
using realestate_ia_site.Server.Infrastructure.Auth;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using realestate_ia_site.Server.Application.Services;

namespace realestate_ia_site.Server.Infrastructure.Extensions;

/// <summary>
/// Extension methods for configuring application layer services
/// </summary>
public static class ApplicationServicesExtensions
{
    /// <summary>
    /// Adds all application services
    /// </summary>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        // AI Services
        services.AddScoped<SearchAIOrchestrator>();
        services.AddScoped<IPropertySemanticAnalyzer, Infrastructure.AI.PropertySemanticAnalyzer>();
        services.AddScoped<IIntelligentRecommendationEngine, Infrastructure.AI.IntelligentRecommendationEngine>();
        services.AddScoped<IAdvancedQueryInterpreter, Infrastructure.AI.AdvancedQueryInterpreter>();
        
        // Property Services
        services.AddScoped<IPropertySearchService, PropertySearchService>();
        services.AddScoped<PropertyImportService>();
        services.AddScoped<IPropertyTrackingService, PropertyTrackingService>();
        
        // Auth Services
        services.AddScoped<AuthService>();
        services.AddScoped<GoogleAuthService>();
        
        // Payment Services
        services.AddScoped<SubscriptionApplicationService>();

        return services;
    }
}
