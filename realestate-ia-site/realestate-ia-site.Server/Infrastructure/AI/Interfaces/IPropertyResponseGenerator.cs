using realestate_ia_site.Server.DTOs;

namespace realestate_ia_site.Server.Infrastructure.AI.Interfaces
{
    public interface IPropertyResponseGenerator
    {
        Task<string> GenerateResponseAsync(string originalQuery, List<PropertySearchDto> properties, CancellationToken cancellationToken = default);
    }
}