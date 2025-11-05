using realestate_ia_site.Server.Application.Common.DTOs;

namespace realestate_ia_site.Server.Application.Features.Properties.Search;

public interface IPropertySearchService
{
    Task<List<PropertySearchDto>> SearchPropertiesWithFiltersAsync(
        Dictionary<string, object> filters,
        CancellationToken cancellationToken = default);

    Task<List<PropertySearchDto>> GetTopPicksAsync(
        Dictionary<string, object> filters,
        CancellationToken cancellationToken = default);
}
