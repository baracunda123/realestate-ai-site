using realestate_ia_site.Server.DTOs;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Interfaces
{
    public interface IPropertySearchService
    {
        Task<List<PropertySearchDto>> SearchPropertiesWithFiltersAsync(
            Dictionary<string, object> filters, 
            CancellationToken cancellationToken = default);
            
        Task<List<PropertySearchDto>> GetTopPicksAsync(
            Dictionary<string, object> filters, 
            CancellationToken cancellationToken = default);
    }
}