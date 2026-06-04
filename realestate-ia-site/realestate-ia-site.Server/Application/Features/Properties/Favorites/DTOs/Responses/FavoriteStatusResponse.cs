namespace realestate_ia_site.Server.Application.Features.Properties.Favorites.DTOs;

public class FavoriteStatusResponse
{
    public string PropertyId { get; set; } = string.Empty;
    public bool IsFavorite { get; set; }
}
