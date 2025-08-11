namespace realestate_ia_site.Server.DTOs.SearchAI
{
    public sealed class SearchAIResponseDto
    {
        public IReadOnlyList<PropertySearchDto> Properties { get; init; } = Array.Empty<PropertySearchDto>();
        public string AIResponse { get; init; } = string.Empty;
    }
}
