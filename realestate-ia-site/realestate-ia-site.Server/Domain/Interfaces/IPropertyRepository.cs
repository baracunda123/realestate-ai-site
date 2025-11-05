using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Domain.Interfaces;

/// <summary>
/// Repository interface for Property-specific operations
/// </summary>
public interface IPropertyRepository : IRepository<Property>
{
    Task<Property?> GetByLinkAsync(string link, CancellationToken cancellationToken = default);
    Task<IEnumerable<Property>> GetByLocationAsync(string location, CancellationToken cancellationToken = default);
    Task<IEnumerable<Property>> GetByPriceRangeAsync(decimal? minPrice, decimal? maxPrice, CancellationToken cancellationToken = default);
    Task<IEnumerable<Property>> GetRecentPropertiesAsync(int count, CancellationToken cancellationToken = default);
}
