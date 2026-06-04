using realestate_ia_site.Server.Application.Features.Properties.DTOs;

namespace realestate_ia_site.Server.Application.Features.Properties.Favorites.DTOs;

public class FavoritePropertiesResponse
{
    public List<PropertySearchDto> Favorites { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasNextPage { get; set; }
    public bool HasPreviousPage { get; set; }
}
