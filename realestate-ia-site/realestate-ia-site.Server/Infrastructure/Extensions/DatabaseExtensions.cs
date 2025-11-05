using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Infrastructure.Persistence;
using realestate_ia_site.Server.Domain.Interfaces;
using realestate_ia_site.Server.Infrastructure.Persistence.Repositories;
using realestate_ia_site.Server.Application.Common.Interfaces;

namespace realestate_ia_site.Server.Infrastructure.Extensions;

/// <summary>
/// Extension methods for configuring database services
/// </summary>
public static class DatabaseExtensions
{
    /// <summary>
    /// Adds database context and repository services
    /// </summary>
    public static IServiceCollection AddDatabaseServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Get connection string from environment or configuration
        var connectionString = Environment.GetEnvironmentVariable("DATABASE_CONNECTION_STRING")
                              ?? configuration.GetConnectionString("DefaultConnection")
                              ?? throw new InvalidOperationException("Database connection string must be configured");

        // Add DbContext with PostgreSQL
        services.AddDbContext<ApplicationDbContext>(opt =>
            opt.UseNpgsql(connectionString, options =>
            {
                options.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromSeconds(30),
                    errorCodesToAdd: null);
                options.CommandTimeout(30);
            }));

        // Register IApplicationDbContext
        services.AddScoped<IApplicationDbContext>(sp =>
            sp.GetRequiredService<ApplicationDbContext>());

        // Register Repositories & Unit of Work
        services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
        services.AddScoped<IPropertyRepository, PropertyRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Add Memory Cache
        services.AddMemoryCache();

        return services;
    }
}
