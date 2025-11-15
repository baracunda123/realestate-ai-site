using realestate_ia_site.Server.Infrastructure.Extensions;

var builder = WebApplication.CreateBuilder(args);

// ============================================================================
// AZURE CONFIGURATION
// ============================================================================
if (builder.Environment.IsProduction())
{
    var contentRoot = Directory.GetCurrentDirectory();
    var webRoot = Path.Combine(contentRoot, "wwwroot");
    
    builder.Configuration.SetBasePath(contentRoot);
    
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

// ============================================================================
// LOGGING
// ============================================================================
// NÃO usar ClearProviders() - remove o provider do Azure App Service!
// builder.Logging.ClearProviders(); 

builder.Logging.AddConsole(options =>
{
    options.FormatterName = "simple";
});
builder.Logging.AddSimpleConsole(options =>
{
    options.IncludeScopes = true;
    options.SingleLine = false;
    options.TimestampFormat = "[HH:mm:ss] ";
    options.ColorBehavior = Microsoft.Extensions.Logging.Console.LoggerColorBehavior.Enabled;
});
builder.Logging.AddDebug();

// Adicionar Azure App Service logging provider (para Log Stream)
if (builder.Environment.IsProduction())
{
    builder.Logging.AddAzureWebAppDiagnostics();
}

// Configurar níveis de log globais
// Mostrar TODOS os logs da aplicação (dev e produção)
builder.Logging.SetMinimumLevel(LogLevel.Information);

// Reduzir ruído do framework (ASP.NET Core e Entity Framework)
builder.Logging.AddFilter("Microsoft.AspNetCore", LogLevel.Warning);
builder.Logging.AddFilter("Microsoft.EntityFrameworkCore", LogLevel.Warning);
builder.Logging.AddFilter("Microsoft.Extensions.Http", LogLevel.Warning);
builder.Logging.AddFilter("System.Net.Http", LogLevel.Warning);

// Garantir que TODOS os logs da nossa aplicação aparecem (dev e produção)
builder.Logging.AddFilter("realestate_ia_site", LogLevel.Information);

// Azure Application Insights (apenas em produção, para telemetria adicional)
if (builder.Environment.IsProduction())
{
    var connectionString = builder.Configuration["ApplicationInsights:ConnectionString"];
    if (!string.IsNullOrEmpty(connectionString))
    {
        builder.Services.AddApplicationInsightsTelemetry(options =>
        {
            options.ConnectionString = connectionString;
            options.EnableAdaptiveSampling = true;
            options.EnableQuickPulseMetricStream = true;
        });
        
        // Adicionar Application Insights ao logging (envia logs para Azure)
        builder.Logging.AddApplicationInsights(
            configureTelemetryConfiguration: (config) => config.ConnectionString = connectionString,
            configureApplicationInsightsLoggerOptions: (options) => { }
        );
    }
    
    builder.Configuration.AddEnvironmentVariables();
}

// ============================================================================
// SERVICES CONFIGURATION
// ============================================================================

// Database (DbContext, Repositories, Unit of Work)
builder.Services.AddDatabaseServices(builder.Configuration);

// Authentication & Authorization (Identity, JWT)
builder.Services.AddAuthenticationServices(builder.Configuration);

// Application Services (AI, Properties, Payments)
builder.Services.AddApplicationServices();

// Infrastructure Services (Security, Storage, AI, Notifications, Events, etc.)
builder.Services.AddInfrastructureServices(builder.Configuration, builder.Environment);

// API Services (Controllers, Swagger, CORS)
builder.Services.AddApiServices(builder.Configuration, builder.Environment);

// ============================================================================
// BUILD APPLICATION
// ============================================================================
var app = builder.Build();

// ============================================================================
// MIDDLEWARE PIPELINE
// ============================================================================
app.UseMiddlewarePipeline(builder.Configuration);

// ============================================================================
// RUN APPLICATION
// ============================================================================
app.Run();
