using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;

using realestate_ia_site.Server.Application.SearchAI;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Infrastructure.AI;
using realestate_ia_site.Server.Infrastructure.AI.Interfaces;
using realestate_ia_site.Server.Infrastructure.Persistence;
using realestate_ia_site.Server.Infrastructure.Persistence.Filters;
using realestate_ia_site.Server.Infrastructure.ExternalServices;
using realestate_ia_site.Server.Infrastructure.Scraper;
using realestate_ia_site.Server.Infrastructure.Persistence.Interfaces;
using realestate_ia_site.Server.Middleware;
using realestate_ia_site.Server.Infrastructure.Notifications;
using realestate_ia_site.Server.Infrastructure.Events;
using realestate_ia_site.Server.Domain.Entities;

var builder = WebApplication.CreateBuilder(args);

// Configurar Identity
builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    // Configurações de senha
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 8;
    options.Password.RequiredUniqueChars = 4;

    // Configurações de bloqueio
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;

    // Configurações de usuário
    options.User.RequireUniqueEmail = true;
    options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";

    // Configurações de email
    options.SignIn.RequireConfirmedEmail = true;
    options.SignIn.RequireConfirmedPhoneNumber = false;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// Configurar JWT
builder.Services.AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SecretKey"]!)),
            ClockSkew = TimeSpan.Zero
        };
    });

// Configurar Rate Limiting
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("AuthPolicy", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                QueueLimit = 2
            }));
});

// Add orchestrator 
builder.Services.AddScoped<SearchAIOrchestrator>();

// Add AI services
builder.Services.AddSingleton<IOpenAIService, OpenAIService>();
builder.Services.AddScoped<IPropertyFilterInterpreter, PropertyFilterInterpreter>();
builder.Services.AddScoped<IPropertyResponseGenerator, PropertyResponseGenerator>();
builder.Services.AddScoped<PropertyAIService>();
builder.Services.AddScoped<LocationAIService>();
builder.Services.AddScoped<IConversationContextService, ConversationContextService>();

// Add persistence services
builder.Services.AddScoped<IPropertySearchService,PropertySearchService>();
builder.Services.AddScoped<PropertyImportService>();

// Add external services
builder.Services.AddScoped<GoogleMapsService>();
builder.Services.AddScoped<ScraperStateProvider>();
builder.Services.AddMemoryCache();

// Add HttpClient for GoogleMapsService
builder.Services.AddHttpClient<GoogleMapsService>();

// Add DbContext with PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add filters
builder.Services.AddScoped<IPropertyFilter, TypeFilter>();
builder.Services.AddScoped<IPropertyFilter, LocationFilter>();
builder.Services.AddScoped<IPropertyFilter, PriceFilter>();
builder.Services.AddScoped<IPropertyFilter, RoomsFilter>();
builder.Services.AddScoped<IPropertyFilter, TagsFilter>();
builder.Services.AddScoped<IPropertyFilter, SortFilter>();
builder.Services.AddScoped<IPropertyFilter, TopPicksFilter>();

// Add notification services
builder.Services.Configure<EmailConfiguration>(builder.Configuration.GetSection("Email"));
builder.Services.Configure<SmsConfiguration>(builder.Configuration.GetSection("Sms"));

builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ISmsService, TwilioSmsService>();
builder.Services.AddScoped<PropertyAlertService>();

// Add event handling
builder.Services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();
builder.Services.AddScoped<IDomainEventHandler<PropertyCreatedEvent>, PropertyAlertEventHandler>();
builder.Services.AddScoped<IDomainEventHandler<PropertyPriceChangedEvent>, PropertyAlertEventHandler>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("https://yourdomain.com") // Seu domínio específico
              .AllowCredentials()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Adicionar headers de segurança
app.Use(async (context, next) =>
{
    // Content Security Policy mais restritiva
    context.Response.Headers["Content-Security-Policy"] = 
        "default-src 'self'; " +
        "script-src 'self'; " + // REMOVER 'unsafe-inline' e 'unsafe-eval'
        "style-src 'self' 'unsafe-inline'; " + // CSS inline ainda permitido
        "img-src 'self' data: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self'; " +
        "frame-ancestors 'none'; " +
        "base-uri 'self'; " + 
        "form-action 'self';"; 
    
    // Headers adicionais de segurança
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    
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

// ADICIONAR: Middleware de sessão antes da autorização
app.UseMiddleware<SessionMiddleware>();

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseCors();
app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();
