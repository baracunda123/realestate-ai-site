using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Threading.RateLimiting;

using realestate_ia_site.Server.Application.SearchAI;
using realestate_ia_site.Server.Application.PropertyAlerts;
using realestate_ia_site.Server.Application.PropertySearch;
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

var builder = WebApplication.CreateBuilder(args);

// Identity
builder.Services.AddIdentity<User, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredLength = 8;
    options.Password.RequiredUniqueChars = 4;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.AllowedForNewUsers = true;
    options.User.RequireUniqueEmail = true;
    options.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";
    options.SignIn.RequireConfirmedEmail = true;
    options.SignIn.RequireConfirmedPhoneNumber = false;
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// Authentication / JWT
builder.Services.AddAuthentication(o =>
{
    o.DefaultAuthenticateScheme = "Bearer";
    o.DefaultChallengeScheme = "Bearer";
})
.AddJwtBearer("Bearer", o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
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

// Rate Limiter
builder.Services.AddRateLimiter(options =>
{
    options.AddPolicy("JwtPolicy", ctx => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions { PermitLimit = 100, Window = TimeSpan.FromMinutes(1) }));
    options.AddPolicy("AuthPolicy", ctx => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
    options.AddPolicy("PaymentPolicy", ctx => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(1) }));
});

// DbContext
builder.Services.AddDbContext<ApplicationDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());

// Application services
builder.Services.AddScoped<SearchAIOrchestrator>();
builder.Services.AddScoped<PropertyAlertService>();
builder.Services.AddScoped<IPropertySearchService, PropertySearchService>();
builder.Services.AddScoped<AuthService>();

// AI
builder.Services.AddSingleton<IOpenAIService, OpenAIService>();
builder.Services.AddScoped<IPropertyFilterInterpreter, PropertyFilterInterpreter>();
builder.Services.AddScoped<IPropertyResponseGenerator, PropertyResponseGenerator>();
builder.Services.AddScoped<PropertyAIService>();
builder.Services.AddScoped<LocationAIService>();
builder.Services.AddScoped<IConversationContextService, ConversationContextService>();

// Configurations (Stripe etc.)
builder.Services.AddSingleton<StripeOptions>();

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
builder.Services.Configure<SmsConfiguration>(builder.Configuration.GetSection("Sms"));
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ISmsService, TwilioSmsService>();

// Domain events
builder.Services.AddScoped<IDomainEventDispatcher, DomainEventDispatcher>();
builder.Services.AddScoped<IDomainEventHandler<PropertyCreatedEvent>, PropertyAlertEventHandler>();
builder.Services.AddScoped<IDomainEventHandler<PropertyPriceChangedEvent>, PropertyAlertEventHandler>();

// API basics
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.WithOrigins("https://localhost:64222")
                  .AllowCredentials()
                  .AllowAnyMethod()
                  .WithHeaders("Content-Type", "Authorization", "X-Session-ID");
        }
        else
        {
            policy.WithOrigins("https://yourdomain.com")
                  .AllowCredentials()
                  .AllowAnyMethod()
                  .WithHeaders("Content-Type", "Authorization", "X-Session-ID");
        }
    });
});

var app = builder.Build();

// Security headers / CSP
app.Use(async (context, next) =>
{
    if (app.Environment.IsDevelopment())
    {
        context.Response.Headers["Content-Security-Policy"] =
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src 'self' https: http:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';";
    }
    else
    {
        context.Response.Headers["Content-Security-Policy"] =
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self';";
    }

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
app.UseMiddleware<SessionMiddleware>();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.UseCors();
app.MapControllers();

if (!app.Environment.IsDevelopment())
{
    app.MapFallbackToFile("/index.html");
}

app.Run();
