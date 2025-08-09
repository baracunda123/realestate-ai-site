using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Services;
using realestate_ia_site.Server.Services.AIServices;
using realestate_ia_site.Server.Services.PropertyServices;
using realestate_ia_site.Server.Services.ScraperServices;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddSingleton<OpenAIService>();
builder.Services.AddScoped<LocationAIService>();
builder.Services.AddScoped<PropertySearchService>();
builder.Services.AddScoped<PropertyAISearchService>();
builder.Services.AddScoped<PropertyImportService>();
builder.Services.AddScoped<ScraperStateService>();


// Add HttpClient/memory cache for GoogleMapsService
builder.Services.AddHttpClient<GoogleMapsService>();
builder.Services.AddScoped<GoogleMapsService>();
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
