using Microsoft.EntityFrameworkCore;

namespace realestate_ia_site.Server.Application.Common.DTOs;

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
    
    // Price Change Info
    public bool HadRecentPriceChange { get; set; }
    public decimal? PriceChangePercentage { get; set; } // Positive = increase, Negative = decrease
    public DateTime? LastPriceChangeDate { get; set; }
    public decimal? OldPrice { get; set; }

    public static PropertySearchDto FromDomain(
        realestate_ia_site.Server.Domain.Entities.Property property,
        realestate_ia_site.Server.Domain.Entities.PropertyPriceHistory? latestPriceChange = null)
    {
        var dto = new PropertySearchDto
        {
            Id = property.Id,
            SiteName = GetFriendlySiteName(property.SourceSite),
            Title = property.Title ?? "N/A",
            Description = property.Description ?? string.Empty,
            Type = property.Type ?? "N/A",
            Location = FormatLocation(property),
            Address = property.Address ?? string.Empty,
            Price = property.Price ?? 0,
            Bedrooms = property.Bedrooms ?? 0,
            Bathrooms = property.Bathrooms ?? 0,
            Area = property.Area ?? 0,
            ImageUrl = property.ImageUrl,
            Link = property.Link,
            CreatedAt = property.CreatedAt
        };

        // Calculate price change info if available
        if (latestPriceChange != null && latestPriceChange.NewPrice != latestPriceChange.OldPrice)
        {
            var change = latestPriceChange.NewPrice - latestPriceChange.OldPrice;
            var changePercentage = (change / latestPriceChange.OldPrice) * 100;

            dto.HadRecentPriceChange = true;
            dto.PriceChangePercentage = Math.Round(changePercentage, 1); // Negative = decrease, Positive = increase
            dto.LastPriceChangeDate = latestPriceChange.ChangedAt;
            dto.OldPrice = latestPriceChange.OldPrice;
        }

        return dto;
    }

    /// <summary>
    /// Formata a localização completa combinando City, County e State
    /// </summary>
    private static string FormatLocation(realestate_ia_site.Server.Domain.Entities.Property property)
    {
        var parts = new List<string>();
        
        if (!string.IsNullOrWhiteSpace(property.City))
            parts.Add(property.City);
        
        if (!string.IsNullOrWhiteSpace(property.County) && property.County != property.City)
            parts.Add(property.County);
        
        if (!string.IsNullOrWhiteSpace(property.State) && property.State != "Portugal")
            parts.Add(property.State);
        
        return parts.Count > 0 ? string.Join(", ", parts) : "Localização não disponível";
    }

    /// <summary>
    /// Converte o nome técnico do site em nome amigável (Idealista, Imovirtual, etc.)
    /// </summary>
    private static string GetFriendlySiteName(string? sourceSite)
    {
        if (string.IsNullOrWhiteSpace(sourceSite))
            return "N/A";

        return sourceSite.ToLower() switch
        {
            "idealista" => "Idealista",
            "imovirtual" => "Imovirtual",
            "casasapo" => "Casa Sapo",
            "custojusto" => "Custo Justo",
            "olx" => "OLX",
            "remax" => "RE/MAX",
            "era" => "ERA",
            "century21" => "Century 21",
            _ => sourceSite
        };
    }
}
