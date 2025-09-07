using realestate_ia_site.Server.Application.DTOs.PropertySearch;

namespace realestate_ia_site.Server.Application.AI.Interfaces;

public interface IPropertyResponseGenerator
{
    Task<string> GenerateResponseAsync(
        string originalQuery,
        List<PropertySearchDto> properties,
        CancellationToken cancellationToken = default);

    Task<string> GenerateResponseAsync(
        string originalQuery,
        List<PropertySearchDto> properties,
        string sessionId,
        CancellationToken cancellationToken = default);
}
