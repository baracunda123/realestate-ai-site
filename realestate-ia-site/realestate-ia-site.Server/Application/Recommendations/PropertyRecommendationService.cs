using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Recommendations.DTOs;

namespace realestate_ia_site.Server.Application.Recommendations
{
    public class PropertyRecommendationService
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<PropertyRecommendationService> _logger;

        public PropertyRecommendationService(
            IApplicationDbContext context,
            ILogger<PropertyRecommendationService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task ProcessNewPropertyForRecommendationsAsync(
            Property property,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Processing recommendations for new property {PropertyId}", property.Id);

            try
            {
                // Encontrar utilizadores interessados
                var interestedUsers = await FindInterestedUsersAsync(property, cancellationToken);

                foreach (var userId in interestedUsers)
                {
                    var score = await CalculateRecommendationScoreAsync(userId, property, cancellationToken);
                    
                    if (score >= 70) // Score mínimo de 70%
                    {
                        await CreateRecommendationAsync(userId, property, score, "nova_propriedade", cancellationToken);
                    }
                }

                _logger.LogInformation("Processed recommendations for {UserCount} users", interestedUsers.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing recommendations for property {PropertyId}", property.Id);
            }
        }

        public async Task ProcessPriceChangeForRecommendationsAsync(
            Property property,
            decimal oldPrice,
            CancellationToken cancellationToken = default)
        {
            if (!property.Price.HasValue || property.Price >= oldPrice) return;

            var reduction = ((oldPrice - property.Price.Value) / oldPrice) * 100;
            if (reduction < 5) return; // Só reduções > 5%

            _logger.LogInformation("Processing price reduction recommendations for property {PropertyId}, reduction: {Reduction}%", 
                property.Id, reduction);

            try
            {
                // Utilizadores que já mostraram interesse
                var interestedUsers = await FindUsersWhoFavoritedPropertyAsync(property.Id, cancellationToken);
                
                foreach (var userId in interestedUsers)
                {
                    await CreateRecommendationAsync(userId, property, 95, "reducao_preco", cancellationToken);
                }

                _logger.LogInformation("Created price reduction recommendations for {UserCount} users", interestedUsers.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing price change recommendations for property {PropertyId}", property.Id);
            }
        }

        public async Task<DashboardRecommendationsDto> GetUserRecommendationsAsync(
            string userId,
            int limit = 10,
            CancellationToken cancellationToken = default)
        {
            var recommendations = await _context.PropertyRecommendations
                .Include(r => r.Property)
                .Where(r => r.UserId == userId && r.IsActive)
                .OrderByDescending(r => r.Score)
                .ThenByDescending(r => r.CreatedAt)
                .Take(limit)
                .ToListAsync(cancellationToken);

            return new DashboardRecommendationsDto
            {
                Properties = recommendations.Select(r => new RecommendedPropertyDto
                {
                    PropertyId = r.PropertyId,
                    Title = r.Property.Title ?? "Propriedade sem título",
                    Location = FormatLocation(r.Property),
                    Price = r.Property.Price,
                    Bedrooms = r.Property.Bedrooms,
                    Type = r.Property.Type,
                    Score = r.Score,
                    Reason = r.Reason,
                    ReasonText = GetReasonText(r.Reason),
                    CreatedAt = r.CreatedAt,
                    IsViewed = r.ViewedAt.HasValue
                }).ToList(),
                TotalCount = recommendations.Count
            };
        }

        private async Task<List<string>> FindInterestedUsersAsync(
            Property property,
            CancellationToken cancellationToken)
        {
            var users = new HashSet<string>();

            // 1. Utilizadores com pesquisas similares (últimos 30 dias)
            var searchUsers = await _context.SavedSearches
                .Where(s => s.CreatedAt > DateTime.UtcNow.AddDays(-30) && s.IsActive)
                .Where(s => MatchesSearchCriteria(s, property))
                .Select(s => s.UserId)
                .ToListAsync(cancellationToken);

            users.UnionWith(searchUsers);

            // 2. Utilizadores com favoritos similares
            var favoriteUsers = await _context.Favorites
                .Include(f => f.Property)
                .Where(f => IsSimilarProperty(f.Property, property))
                .Select(f => f.UserId)
                .ToListAsync(cancellationToken);

            users.UnionWith(favoriteUsers);

            _logger.LogInformation("Found {UserCount} users interested in property {PropertyId} based on searches and favorites", 
                users.Count, property.Id);

            return users.ToList();
        }

        private async Task<List<string>> FindUsersWhoFavoritedPropertyAsync(
            string propertyId,
            CancellationToken cancellationToken)
        {
            var favoriteUsers = await _context.Favorites
                .Where(f => f.PropertyId == propertyId)
                .Select(f => f.UserId)
                .ToListAsync(cancellationToken);

            return favoriteUsers;
        }

        private async Task<int> CalculateRecommendationScoreAsync(
            string userId,
            Property property,
            CancellationToken cancellationToken)
        {
            int score = 0;

            // Analisar comportamento do utilizador
            var userBehavior = await AnalyzeUserBehaviorAsync(userId, cancellationToken);

            // 1. Localização (30 pontos)
            score += CalculateLocationScore(property, userBehavior.PreferredLocations);

            // 2. Preço (25 pontos)
            score += CalculatePriceScore(property, userBehavior.AveragePriceBudget);

            // 3. Tipo de propriedade (20 pontos)
            score += CalculateTypeScore(property, userBehavior.PreferredTypes);

            // 4. Características (15 pontos)
            score += CalculateCharacteristicsScore(property, userBehavior);

            // 5. Tempo/Recência (10 pontos)
            score += CalculateRecencyScore(userBehavior.LastActivityDate);

            return Math.Min(score, 100);
        }

        private async Task<UserBehaviorAnalysis> AnalyzeUserBehaviorAsync(
            string userId,
            CancellationToken cancellationToken)
        {
            // Pesquisas recentes
            var searches = await _context.SavedSearches
                .Where(s => s.UserId == userId && s.CreatedAt > DateTime.UtcNow.AddDays(-60))
                .ToListAsync(cancellationToken);

            // Favoritos
            var favorites = await _context.Favorites
                .Include(f => f.Property)
                .Where(f => f.UserId == userId)
                .ToListAsync(cancellationToken);

            return new UserBehaviorAnalysis
            {
                PreferredLocations = ExtractPreferredLocations(searches, favorites),
                PreferredTypes = ExtractPreferredTypes(searches, favorites),
                AveragePriceBudget = CalculateAverageBudget(searches, favorites),
                PreferredBedrooms = ExtractPreferredBedrooms(searches, favorites),
                PrefersGarage = ExtractGaragePreference(favorites),
                LastActivityDate = GetLastActivityDate(searches, favorites)
            };
        }

        // Métodos auxiliares de scoring
        private int CalculateLocationScore(Property property, List<string> preferredLocations)
        {
            if (string.IsNullOrEmpty(property.City)) return 0;

            // Match exato
            if (preferredLocations.Contains(property.City, StringComparer.OrdinalIgnoreCase))
                return 30;

            // Match parcial
            if (preferredLocations.Any(loc => 
                property.City.Contains(loc, StringComparison.OrdinalIgnoreCase) ||
                loc.Contains(property.City, StringComparison.OrdinalIgnoreCase)))
                return 20;

            // Mesmo distrito/estado
            if (preferredLocations.Any(loc => 
                !string.IsNullOrEmpty(property.County) && loc.Contains(property.County, StringComparison.OrdinalIgnoreCase)))
                return 10;

            return 0;
        }

        private int CalculatePriceScore(Property property, decimal averageBudget)
        {
            if (!property.Price.HasValue || averageBudget <= 0) return 0;

            var priceRatio = property.Price.Value / averageBudget;

            // Preço perfeito (90-110% do orçamento)
            if (priceRatio >= 0.9m && priceRatio <= 1.1m) return 25;

            // Preço bom (80-120% do orçamento)
            if (priceRatio >= 0.8m && priceRatio <= 1.2m) return 20;

            // Preço aceitável (70-140% do orçamento)
            if (priceRatio >= 0.7m && priceRatio <= 1.4m) return 15;

            // Barganha (abaixo de 70%)
            if (priceRatio < 0.7m) return 10;

            return 0;
        }

        private int CalculateTypeScore(Property property, List<string> preferredTypes)
        {
            if (string.IsNullOrEmpty(property.Type)) return 0;

            if (preferredTypes.Contains(property.Type, StringComparer.OrdinalIgnoreCase))
                return 20;

            return 5; // Score mínimo se não há preferência clara
        }

        private int CalculateCharacteristicsScore(Property property, UserBehaviorAnalysis behavior)
        {
            int score = 0;

            // Quartos
            if (property.Bedrooms.HasValue && behavior.PreferredBedrooms.HasValue)
            {
                var diff = Math.Abs(property.Bedrooms.Value - behavior.PreferredBedrooms.Value);
                score += diff == 0 ? 10 : (diff == 1 ? 7 : 3);
            }

            // Garagem
            if (property.Garage && behavior.PrefersGarage)
            {
                score += 5;
            }

            return score;
        }

        private int CalculateRecencyScore(DateTime lastActivity)
        {
            var daysSinceActivity = (DateTime.UtcNow - lastActivity).Days;
            
            if (daysSinceActivity <= 7) return 10;
            if (daysSinceActivity <= 30) return 7;
            if (daysSinceActivity <= 60) return 5;
            
            return 2;
        }

        private async Task CreateRecommendationAsync(
            string userId,
            Property property,
            int score,
            string reason,
            CancellationToken cancellationToken)
        {
            // Verificar se já existe recomendação
            var existingRecommendation = await _context.PropertyRecommendations
                .FirstOrDefaultAsync(r => r.UserId == userId && r.PropertyId == property.Id, cancellationToken);

            if (existingRecommendation != null)
            {
                // Atualizar score se for melhor
                if (score > existingRecommendation.Score)
                {
                    existingRecommendation.Score = score;
                    existingRecommendation.Reason = reason;
                    existingRecommendation.UpdatedAt = DateTime.UtcNow;
                    existingRecommendation.IsActive = true;
                }
                return;
            }

            // Criar nova recomendação
            var recommendation = new PropertyRecommendation
            {
                UserId = userId,
                PropertyId = property.Id,
                Score = score,
                Reason = reason,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.PropertyRecommendations.Add(recommendation);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created recommendation for user {UserId}, property {PropertyId}, score {Score}",
                userId, property.Id, score);
        }

        // Métodos auxiliares para análise de comportamento
        private List<string> ExtractPreferredLocations(List<SavedSearch> searches, List<Favorite> favorites)
        {
            var locations = new List<string>();

            // De pesquisas guardadas
            locations.AddRange(searches.Where(s => !string.IsNullOrEmpty(s.Location)).Select(s => s.Location!));

            // De favoritos
            locations.AddRange(favorites.Where(f => !string.IsNullOrEmpty(f.Property.City)).Select(f => f.Property.City!));

            return locations.GroupBy(l => l, StringComparer.OrdinalIgnoreCase)
                           .OrderByDescending(g => g.Count())
                           .Select(g => g.Key)
                           .Take(5)
                           .ToList();
        }

        private List<string> ExtractPreferredTypes(List<SavedSearch> searches, List<Favorite> favorites)
        {
            var types = new List<string>();

            // De pesquisas guardadas
            types.AddRange(searches.Where(s => !string.IsNullOrEmpty(s.PropertyType) && s.PropertyType != "any").Select(s => s.PropertyType!));

            // De favoritos
            types.AddRange(favorites.Where(f => !string.IsNullOrEmpty(f.Property.Type)).Select(f => f.Property.Type!));

            return types.GroupBy(t => t, StringComparer.OrdinalIgnoreCase)
                       .OrderByDescending(g => g.Count())
                       .Select(g => g.Key)
                       .Take(3)
                       .ToList();
        }

        private decimal CalculateAverageBudget(List<SavedSearch> searches, List<Favorite> favorites)
        {
            var prices = new List<decimal>();

            // De pesquisas guardadas (usar média entre min e max)
            foreach (var search in searches.Where(s => s.MinPrice.HasValue || s.MaxPrice.HasValue))
            {
                var min = search.MinPrice ?? 0;
                var max = search.MaxPrice ?? 1000000;
                prices.Add((min + max) / 2);
            }

            // De favoritos
            prices.AddRange(favorites.Where(f => f.Property.Price.HasValue).Select(f => f.Property.Price!.Value));

            return prices.Any() ? prices.Average() : 0;
        }

        private int? ExtractPreferredBedrooms(List<SavedSearch> searches, List<Favorite> favorites)
        {
            var bedrooms = new List<int>();

            // De pesquisas guardadas
            bedrooms.AddRange(searches.Where(s => s.Bedrooms.HasValue).Select(s => s.Bedrooms!.Value));

            // De favoritos
            bedrooms.AddRange(favorites.Where(f => f.Property.Bedrooms.HasValue).Select(f => f.Property.Bedrooms!.Value));

            return bedrooms.Any() ? (int)bedrooms.Average() : null;
        }

        private bool ExtractGaragePreference(List<Favorite> favorites)
        {
            var garageCount = favorites.Count(f => f.Property.Garage);
            var totalFavorites = favorites.Count;

            return totalFavorites > 0 && (garageCount / (double)totalFavorites) > 0.5;
        }

        private DateTime GetLastActivityDate(List<SavedSearch> searches, List<Favorite> favorites)
        {
            var dates = new List<DateTime>();

            dates.AddRange(searches.Select(s => s.CreatedAt));
            dates.AddRange(favorites.Select(f => f.CreatedAt));

            return dates.Any() ? dates.Max() : DateTime.UtcNow.AddDays(-365);
        }

        // Métodos auxiliares para matching
        private static bool MatchesSearchCriteria(SavedSearch search, Property property)
        {
            // Location
            if (!string.IsNullOrEmpty(search.Location) && 
                !string.IsNullOrEmpty(property.City) &&
                !property.City.Contains(search.Location, StringComparison.OrdinalIgnoreCase))
                return false;

            // Type
            if (!string.IsNullOrEmpty(search.PropertyType) && 
                search.PropertyType != "any" &&
                !string.Equals(search.PropertyType, property.Type, StringComparison.OrdinalIgnoreCase))
                return false;

            // Price
            if (search.MinPrice.HasValue && property.Price < search.MinPrice) return false;
            if (search.MaxPrice.HasValue && property.Price > search.MaxPrice) return false;

            // Bedrooms
            if (search.Bedrooms.HasValue && property.Bedrooms < search.Bedrooms) return false;

            return true;
        }

        private static bool IsSimilarProperty(Property existing, Property newProperty)
        {
            // Mesma cidade
            if (string.Equals(existing.City, newProperty.City, StringComparison.OrdinalIgnoreCase))
                return true;

            // Mesmo tipo e preço similar (±20%)
            if (string.Equals(existing.Type, newProperty.Type, StringComparison.OrdinalIgnoreCase) &&
                existing.Price.HasValue && newProperty.Price.HasValue)
            {
                var priceDiff = Math.Abs(existing.Price.Value - newProperty.Price.Value) / existing.Price.Value;
                if (priceDiff <= 0.2m) return true;
            }

            return false;
        }

        private static string FormatLocation(Property property)
        {
            var parts = new List<string>();
            
            if (!string.IsNullOrEmpty(property.City)) parts.Add(property.City);
            if (!string.IsNullOrEmpty(property.County)) parts.Add(property.County);

            return parts.Any() ? string.Join(", ", parts) : "Localização não especificada";
        }

        private static string GetReasonText(string reason) => reason switch
        {
            "nova_propriedade" => "Nova propriedade que corresponde às suas preferências",
            "reducao_preco" => "Redução de preço numa propriedade de interesse",
            "similar_favorito" => "Similar às suas propriedades favoritas",
            "similar_pesquisa" => "Corresponde aos seus critérios de pesquisa",
            _ => "Recomendação personalizada"
        };
    }
}