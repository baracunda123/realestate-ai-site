using System.ComponentModel.DataAnnotations;

namespace realestate_ia_site.Server.Application.Features.Properties.Favorites.DTOs;

public class AddFavoriteRequest
{
    [Required]
    public string PropertyId { get; set; } = string.Empty;
}
