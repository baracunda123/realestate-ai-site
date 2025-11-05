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
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

// Load environment variables in production
if (builder.Environment.IsProduction())
{
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
