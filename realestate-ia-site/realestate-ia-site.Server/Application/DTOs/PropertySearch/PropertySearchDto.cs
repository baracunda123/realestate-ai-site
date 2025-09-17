namespace realestate_ia_site.Server.Application.DTOs.PropertySearch;

public class PropertySearchDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Bedrooms { get; set; }
    public int Bathrooms { get; set; }
    public double Area { get; set; }
    public string? ImageUrl { get; set; }
    public string? Link { get; set; }
    public string? SiteName { get; set; } 
    public DateTime? CreatedAt { get; set; }

    public static PropertySearchDto FromDomain(realestate_ia_site.Server.Domain.Entities.Property property)
    {
        return new PropertySearchDto
        {
            Id = property.Id,
            SiteName = GetFriendlySiteName(property.SourceSite),
            Title = property.Title ?? "N/A",
            Description = property.Description ?? string.Empty,
            Type = property.Type ?? "N/A",
            Location = property.City ?? "N/A",
            Address = property.Address ?? string.Empty,
            Price = property.Price ?? 0,
            Bedrooms = property.Bedrooms ?? 0,
            Bathrooms = property.Bathrooms ?? 0,
            Area = property.Area ?? 0,
            ImageUrl = property.ImageUrl,
            Link = property.Link,
            CreatedAt = property.CreatedAt
        };
    }

    /// <summary>
    /// Converte o nome técnico do site em nome amigável
    /// </summary>
    private static string GetFriendlySiteName(string? sourceSite)
    {
        if (string.IsNullOrWhiteSpace(sourceSite))
            return "N/A";

        return sourceSite.ToLower() switch
        {
            "idealista" => "Idealista",
            "imovirtual" => "Imovirtual",
            "casaSapo" => "Casa Sapo", 
            "custojusto" => "Custo Justo",
            "olx" => "OLX",
            "remax" => "RE/MAX",
            "era" => "ERA",
            "century21" => "Century 21",
            _ => sourceSite 
        };
    }
}
