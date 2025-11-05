using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Interfaces;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Repositories;

/// <summary>
/// Repository implementation for Property-specific operations
/// </summary>
public class PropertyRepository : Repository<Property>, IPropertyRepository
{
    public PropertyRepository(ApplicationDbContext context) : base(context)
    {
    }

    public async Task<Property?> GetByLinkAsync(string link, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .FirstOrDefaultAsync(p => p.Link == link, cancellationToken);
    }

    public async Task<IEnumerable<Property>> GetByLocationAsync(
        string location, 
        CancellationToken cancellationToken = default)
    {
        var lowered = location.ToLower();
        return await _dbSet
            .Where(p => 
                (p.City != null && p.City.ToLower().Contains(lowered)) ||
                (p.State != null && p.State.ToLower().Contains(lowered)) ||
                (p.County != null && p.County.ToLower().Contains(lowered)) ||
                (p.CivilParish != null && p.CivilParish.ToLower().Contains(lowered)))
            .ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Property>> GetByPriceRangeAsync(
        decimal? minPrice, 
        decimal? maxPrice, 
        CancellationToken cancellationToken = default)
    {
        var query = _dbSet.AsQueryable();

        if (minPrice.HasValue)
            query = query.Where(p => p.Price.HasValue && p.Price.Value >= minPrice.Value);

        if (maxPrice.HasValue)
            query = query.Where(p => !p.Price.HasValue || p.Price.Value <= maxPrice.Value);

        return await query.ToListAsync(cancellationToken);
    }

    public async Task<IEnumerable<Property>> GetRecentPropertiesAsync(
        int count, 
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .OrderByDescending(p => p.CreatedAt)
            .Take(count)
            .ToListAsync(cancellationToken);
    }
}
