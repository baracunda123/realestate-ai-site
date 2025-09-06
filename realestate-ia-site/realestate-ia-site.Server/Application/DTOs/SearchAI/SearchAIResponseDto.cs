using realestate_ia_site.Server.Application.DTOs.PropertySearch;

namespace realestate_ia_site.Server.Application.DTOs.SearchAI;

public sealed class SearchAIResponseDto
{
    public IReadOnlyList<PropertySearchDto> Properties { get; init; } = Array.Empty<PropertySearchDto>();
    public string AIResponse { get; init; } = string.Empty;
}
