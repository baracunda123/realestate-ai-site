using Microsoft.EntityFrameworkCore;
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

var builder = WebApplication.CreateBuilder(args);

// Add orchestrator 
builder.Services.AddScoped<SearchAIOrchestrator>();

// Add AI services
builder.Services.AddSingleton<IOpenAIService, OpenAIService>();
builder.Services.AddScoped<IPropertyFilterInterpreter, PropertyFilterInterpreter>();
builder.Services.AddScoped<IPropertyResponseGenerator, PropertyResponseGenerator>();
builder.Services.AddScoped<PropertyAIService>();
builder.Services.AddScoped<LocationAIService>();
builder.Services.AddScoped<IConversationContextService, ConversationContextService>();
builder.Services.AddScoped<PropertyResponseParser>(); 

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

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

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

app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("/index.html");

app.Run();
