using realestate_ia_site.Server.Application.Common.DTOs;

namespace realestate_ia_site.Server.Application.Features.AI.SearchAI.DTOs;

public sealed class SearchAIResponseDto
{
    public IReadOnlyList<PropertySearchDto> Properties { get; init; } = Array.Empty<PropertySearchDto>();
    public string AIResponse { get; init; } = string.Empty;
    public Dictionary<string, object>? ExtractedFilters { get; init; }
}
