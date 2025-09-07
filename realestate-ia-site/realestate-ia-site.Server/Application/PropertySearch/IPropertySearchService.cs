using realestate_ia_site.Server.Application.DTOs.PropertySearch;

namespace realestate_ia_site.Server.Application.PropertySearch;

public interface IPropertySearchService
{
    Task<List<PropertySearchDto>> SearchPropertiesWithFiltersAsync(
        Dictionary<string, object> filters,
        CancellationToken cancellationToken = default);

    Task<List<PropertySearchDto>> GetTopPicksAsync(
        Dictionary<string, object> filters,
        CancellationToken cancellationToken = default);
}
