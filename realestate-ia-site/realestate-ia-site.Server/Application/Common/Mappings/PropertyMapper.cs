using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.ExternalServices.Interfaces;
using System.Globalization;
using System.Text.RegularExpressions;

namespace realestate_ia_site.Server.Application.Common.Mappings
{
    public static class PropertyMapper
    {
        public static async Task<Property> MapToPropertyEntityAsync(ScraperPropertyDto property, IGeocodingService geocodingService)
        {
            var text = property.caracteristicas ?? string.Empty;
            var title = property.titleFromListing?.Trim() ?? string.Empty;

            var type = ExtractTypeFromTitle(property.titleFromListing) ?? ExtractTypeFromCharacteristics(text);
            var price = ParsePrice(property.preco);
            var area = ExtractAreaBruta(text);
            var usableArea = ExtractAreaUtil(text);
            var bedrooms = ExtractBedrooms(text) ?? ExtractBedrooms(title);
            var bathrooms = ExtractBathrooms(text);
            var (city, state, county, civilParish) = await ParseLocationAsync(property.location, geocodingService);
            var garage = HasGarage(text);

            return new Property
            {
                Id = Guid.NewGuid().ToString(),
                SourceSite = property.site?.Trim(),
                Title = title,
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
                var cleanPrice = preco.Replace("€", "").Replace(".", "").Replace(",", ".").Trim();

                if (decimal.TryParse(cleanPrice, NumberStyles.Any, CultureInfo.InvariantCulture, out var price))
                {
                    return price;
                }
            }
            catch
            {
                throw new Exception("Erro ao parsear price");
            }

            return null;
        }

        private static double? ExtractAreaBruta(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return null;

            // Melhorar o padrão regex para capturar area bruta com diferentes formatos
            var patterns = new[]
            {
                @"área bruta\s*(\d+(?:[,\.]\d+)?)m²", // area bruta seguida de numero
                @"(\d+(?:[,\.]\d+)?)\s*m²[^,\n]*área bruta", // numero seguido de m2 e area bruta
                @"(\d+(?:[,\.]\d+)?)\s*m²[^,\n]*bruta" // numero seguido de m2 e bruta
            };

            foreach (var pattern in patterns)
            {
                var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase | RegexOptions.Multiline);
                if (match.Success)
                {
                    var areaStr = match.Groups[1].Value.Replace(".", "");
                    if (double.TryParse(areaStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var area))
                    {
                        return area;
                    }
                }
            }

            return null;
        }

        private static double? ExtractAreaUtil(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return null;

            // Melhorar o padrão regex para capturar area util com diferentes formatos
            var patterns = new[]
            {
                @"área util\s*(\d+(?:[,\.]\d+)?)m²", // area util seguida de numero
                @"(\d+(?:[,\.]\d+)?)\s*m²[^,\n]*útil", // numero seguido de m2 e util
                @"(\d+(?:[,\.]\d+)?)\s*m²[^,\n]*úteis" // numero seguido de m2 e teis
            };

            foreach (var pattern in patterns)
            {
                var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase | RegexOptions.Multiline);
                if (match.Success)
                {
                    var areaStr = match.Groups[1].Value.Replace(",", ".");
                    if (double.TryParse(areaStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var area))
                    {
                        return area;
                    }
                }
            }

            return null;
        }

        private static int? ExtractBedrooms(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return null;

            // Primeiro tenta extrair padrões explícitos como "3 quartos" ou "2 suítes"
            var bedroomPatterns = new[]
            {
                @"\b(\d{1,2})\s*suítes?\s*e\s*(\d{1,2})\s*quartos?\b",
                @"\b(\d{1,2})\s*quartos?\b",
                @"\b(\d{1,2})\s*suítes?\b"
            };

            foreach (var pattern in bedroomPatterns)
            {
                var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase | RegexOptions.Multiline);
                if (match.Success)
                {
                    if (match.Groups.Count > 2 && match.Groups[2].Success)
                    {
                        if (int.TryParse(match.Groups[1].Value, out var suites) &&
                            int.TryParse(match.Groups[2].Value, out var rooms))
                        {
                            var total = suites + rooms;
                            if (total <= 50)
                                return total;
                        }
                    }
                    else if (int.TryParse(match.Groups[1].Value, out var bedrooms))
                    {
                        if (bedrooms <= 50)
                            return bedrooms;
                    }
                }
            }

            // Padrão T: procura tipo de imóvel + T ou só T isolado
            // Valida que antes e depois do T não há letras, dígitos ou underscores
            // Garante que há exatamente 1 ou 2 dígitos (não mais) após o T
            var titleMatch = Regex.Match(text, @"(?:\b(?:apartamento|moradia|casa|vivenda|loja|escritório)\b.*?)?(?<![0-9A-Za-z_])T(\d{1,2})(?![0-9A-Za-z_])", RegexOptions.IgnoreCase);
            if (titleMatch.Success && int.TryParse(titleMatch.Groups[1].Value, out var bedroomsFromTitle))
            {
                if (bedroomsFromTitle <= 50)
                    return bedroomsFromTitle;
            }

            return null;
        }

        private static int? ExtractBathrooms(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return null;

            // Padrões melhorados para casas de banho
            var patterns = new[]
            {
                @"(\d+)\s*casas?\s*de\s*banho", // X casas de banho
                @"(\d+)\s*wc", // X wc
                @"(\d+)\s*instalações?\s*sanitárias?" // X instalações sanitárias
            };

            foreach (var pattern in patterns)
            {
                var match = Regex.Match(text, pattern, RegexOptions.IgnoreCase | RegexOptions.Multiline);
                if (match.Success && int.TryParse(match.Groups[1].Value, out var bathrooms))
                {
                    return bathrooms;
                }
            }

            return null;
        }

        private static async Task<(string? city, string? state, string? county, string? CivilParish)> ParseLocationAsync(string? location, IGeocodingService geocodingService)
        {
            if (string.IsNullOrWhiteSpace(location))
                return (null, null, null, null);

            try
            {
                var parsedLocation = await geocodingService.ParseLocationAsync(location);
                return (parsedLocation.City, parsedLocation.State, parsedLocation.County, parsedLocation.CivilParish);
            }
            catch
            {
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

            var garagePatterns = new[]
            {
                @"lugar\s*de\s*garagem",
                @"garagem\s*incluí[dt]o",
                @"com\s*garagem",
                @"estacionamento",
                @"garagem\s*fechada",
                @"garagem\s*para\s*\d+\s*carros?",
                @"lugares?\s*de\s*estacionamento"
            };

            return garagePatterns.Any(pattern => 
                Regex.IsMatch(text, pattern, RegexOptions.IgnoreCase | RegexOptions.Multiline));
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

        public static void UpdatePropertyFromScrapper(Property existing, ScraperPropertyDto dto)
        {
            var text = dto.caracteristicas ?? string.Empty;
            var title = dto.titleFromListing?.Trim() ?? string.Empty;

            existing.Title = title ?? existing.Title;
            existing.Description = string.Join(" ", dto.descricao ?? "") ?? existing.Description;
            existing.Price = ParsePrice(dto.preco) ?? existing.Price;
            // Link NÃO deve ser atualizado - é o identificador único!
            existing.UpdatedAt = DateTime.UtcNow;

            var newType = ExtractTypeFromTitle(dto.titleFromListing) ?? ExtractTypeFromCharacteristics(text);
            if (!string.IsNullOrEmpty(newType))
                existing.Type = newType;

            var newArea = ExtractAreaBruta(text);
            if (newArea.HasValue)
                existing.Area = newArea;

            var newUsableArea = ExtractAreaUtil(text);
            if (newUsableArea.HasValue)
                existing.UsableArea = newUsableArea;

            // Atualiza bedrooms sempre, mesmo que seja null (para limpar valores incorretos)
            var newBedrooms = ExtractBedrooms(text) ?? ExtractBedrooms(title);
            existing.Bedrooms = newBedrooms;

            // Atualiza bathrooms sempre, mesmo que seja null (para limpar valores incorretos)
            var newBathrooms = ExtractBathrooms(text);
            existing.Bathrooms = newBathrooms;

            existing.Garage = HasGarage(text);
        }
    }
}
