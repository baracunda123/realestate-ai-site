using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Application.SearchAI;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Infrastructure;
using realestate_ia_site.Server.Infrastructure.AI;
using realestate_ia_site.Server.Infrastructure.RealEstate;
using realestate_ia_site.Server.Infrastructure.Scraper;


var builder = WebApplication.CreateBuilder(args);


//Add orchestrator 
builder.Services.AddScoped<SearchAIOrchestrator>();

// Add services to the container.
builder.Services.AddSingleton<OpenAIClient>();
builder.Services.AddScoped<LocationAIClient>();
builder.Services.AddScoped<PropertySearchProvider>();
builder.Services.AddScoped<PropertyAISearchHandler>();
builder.Services.AddScoped<PropertyImporter>();
builder.Services.AddScoped<ScraperStateProvider>();

// Add HttpClient/memory cache for GoogleMapsService
builder.Services.AddHttpClient<GoogleMapsClient>();
builder.Services.AddScoped<GoogleMapsClient>();
builder.Services.AddMemoryCache();

// Add DbContext with PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
