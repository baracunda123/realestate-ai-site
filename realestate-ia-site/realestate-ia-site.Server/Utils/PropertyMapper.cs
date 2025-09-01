using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.DTOs.Scraper;
using realestate_ia_site.Server.Infrastructure.ExternalServices;
using System.Globalization;
using System.Text.RegularExpressions;

namespace realestate_ia_site.Server.Utils
{
    public static class PropertyMapper
    {
        public static async Task<Property> MapToPropertyEntityAsync(ScraperPropertyDto property, GoogleMapsService googleMapsService)
        {
            var text = property.caracteristicas ?? string.Empty;
            
            var type = ExtractTypeFromTitle(property.titleFromListing) ?? ExtractTypeFromCharacteristics(text);
            var price = ParsePrice(property.preco);
            var area = ExtractAreaBruta(text);
            var usableArea = ExtractAreaUtil(text);
            var bedrooms = ExtractBedrooms(text);
            var bathrooms = ExtractBathrooms(text);
            var (city, state, county,civilParish) = await ParseLocationAsync(property.location, googleMapsService);
            var garage = HasGarage(text);

            return new Property
            {
                Id = Guid.NewGuid().ToString(),
                Title = property.titleFromListing?.Trim(),
                Description = string.Join(" ", property.descricao ?? ""),
                Type = type,
                Price = price,
                Address = property.location?.Trim(),
                City = city,
                State = state,
                County = county,
                CivilParish = civilParish,
                ZipCode = ExtractZipCode(property.location),
                Area = area,
                UsableArea = usableArea,
                Bedrooms = bedrooms,
                Bathrooms = bathrooms,
                Garage = garage,
                ImageUrl = null,
                Link = property.url?.Trim(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow             
            };
        }

        private static string? ExtractTypeFromTitle(string? title)
        {
            if (string.IsNullOrWhiteSpace(title))
                return null;

            var match = Regex.Match(title, @"\b(apartamento|moradia|casa|vivenda|loja|escritório)\b", RegexOptions.IgnoreCase);
            return match.Success ? CapitalizeFirstLetter(match.Groups[1].Value) : null;
        }

        private static string? ExtractTypeFromCharacteristics(string? caracteristicas)
        {
            if (string.IsNullOrWhiteSpace(caracteristicas))
                return "Outros";

            var lower = caracteristicas.ToLower();
            
            if (lower.Contains("apartamento"))
                return "Apartamento";
            if (lower.Contains("moradia") || lower.Contains("casa") || lower.Contains("vivenda"))
                return "Moradia";
            if (lower.Contains("loja"))
                return "Loja";
            if (lower.Contains("escritório"))
                return "Escritório";
            if (lower.Contains("terreno"))
                return "Terreno";

            return "Outros";
        }

        private static decimal? ParsePrice(string? preco)
        {
            if (string.IsNullOrWhiteSpace(preco))
                return null;

            try
            {
                // Remove € e pontos, substitui vírgula por ponto
                var cleanPrice = preco.Replace("€", "").Replace(".", "").Replace(",", ".").Trim();
                
                if (decimal.TryParse(cleanPrice, NumberStyles.Any, CultureInfo.InvariantCulture, out var price))
                {
                    return price;
                }
            }
            catch
            {
                // Log error if needed
            }

            return null;
        }

        private static double? ExtractAreaBruta(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return null;

            // Procura por padrão como "120 m² área bruta" ou "120m2 área bruta"
            var match = Regex.Match(text, @"(\d+(?:\.\d+)?)\s*m²[^,]*área bruta", RegexOptions.IgnoreCase);
            
            if (match.Success)
            {
                var areaStr = match.Groups[1].Value.Replace(",", ".");
                if (double.TryParse(areaStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var area))
                {
                    return area;
                }
            }

            return null;
        }

        private static double? ExtractAreaUtil(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return null;

            // Procura por padrão como "120 m² úteis" ou "120m2 úteis"
            var match = Regex.Match(text, @"(\d+(?:\.\d+)?)\s*m²[^,]*úteis", RegexOptions.IgnoreCase);
            
            if (match.Success)
            {
                var areaStr = match.Groups[1].Value.Replace(",", ".");
                if (double.TryParse(areaStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var area))
                {
                    return area;
                }
            }

            return null;
        }

        private static int? ExtractBedrooms(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return null;

            // Procura por padrão T3, T2, etc.
            var match = Regex.Match(text, @"T(\d+)", RegexOptions.IgnoreCase);
            
            if (match.Success && int.TryParse(match.Groups[1].Value, out var bedrooms))
            {
                return bedrooms;
            }

            return null;
        }

        private static int? ExtractBathrooms(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return null;

            // Procura por padrão como "2 casas de banho"
            var match = Regex.Match(text, @"(\d+).*casas de banho", RegexOptions.IgnoreCase);
            
            if (match.Success && int.TryParse(match.Groups[1].Value, out var bathrooms))
            {
                return bathrooms;
            }

            return null;
        }

        private static async Task<(string? city, string? state, string? county, string? CivilParish)> ParseLocationAsync(string? location, GoogleMapsService googleMapsService)
        {
            if (string.IsNullOrWhiteSpace(location))
                return (null, null,null,null);

            try
            {
                var parsedLocation = await googleMapsService.ParseLocationAsync(location);
                return (parsedLocation.City, parsedLocation.State,parsedLocation.County,parsedLocation.CivilParish);
            }
            catch
            {
                // Fallback
                var parts = location.Split(',');
                var county = parts.FirstOrDefault()?.Trim();
                var city = parts.FirstOrDefault()?.Trim();
                var state = parts.Length > 1 ? parts[1].Trim() : "Portugal";
                var civilParish = parts.Length > 2 ? parts[2].Trim() : null;

                return (city, state, county, civilParish);
            }
        }

        private static bool HasGarage(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return false;

            return Regex.IsMatch(text, @"lugar de garagem|garagem incluído|com garagem", RegexOptions.IgnoreCase);
        }

        private static string? ExtractZipCode(string? location)
        {
            if (string.IsNullOrWhiteSpace(location))
                return null;

            var match = Regex.Match(location, @"\b(\d{4}-\d{3})\b");
            return match.Success ? match.Groups[1].Value : null;
        }

        private static string CapitalizeFirstLetter(string input)
        {
            if (string.IsNullOrEmpty(input))
                return string.Empty;

            return char.ToUpper(input[0]) + input[1..].ToLower();
        }

        // Método para atualizar propriedade existente
        public static void UpdatePropertyFromScrapper(Property existing, ScraperPropertyDto dto)
        {
            var text = dto.caracteristicas ?? string.Empty;

            existing.Title = dto.titleFromListing?.Trim() ?? existing.Title;
            existing.Description = string.Join(" ", dto.descricao ?? "") ?? existing.Description;
            existing.Price = ParsePrice(dto.preco) ?? existing.Price;
            existing.Link = dto.url?.Trim() ?? existing.Link;
            existing.UpdatedAt = DateTime.UtcNow;

            // Atualizar outros campos se necessário
            var newType = ExtractTypeFromTitle(dto.titleFromListing) ?? ExtractTypeFromCharacteristics(text);
            if (!string.IsNullOrEmpty(newType))
                existing.Type = newType;

            var newArea = ExtractAreaBruta(text);
            if (newArea.HasValue)
                existing.Area = newArea;

            var newUsableArea = ExtractAreaUtil(text);
            if (newUsableArea.HasValue)
                existing.UsableArea = newUsableArea;

            var newBedrooms = ExtractBedrooms(text);
            if (newBedrooms.HasValue)
                existing.Bedrooms = newBedrooms;

            var newBathrooms = ExtractBathrooms(text);
            if (newBathrooms.HasValue)
                existing.Bathrooms = newBathrooms;

            existing.Garage = HasGarage(text);
        }
    }
}