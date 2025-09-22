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

        // NOVOS MÉTODOS PROATIVOS

        /// <summary>
        /// Processar propriedades similares baseado numa propriedade favoritada
        /// </summary>
        public async Task ProcessSimilarPropertiesAsync(
            string userId,
            Property favoriteProperty,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Processing similar properties for user {UserId} based on favorite {PropertyId}", 
                userId, favoriteProperty.Id);

            try
            {
                // Encontrar propriedades similares baseado em múltiplos critérios
                var similarProperties = await FindSimilarPropertiesAsync(favoriteProperty, cancellationToken);

                int recommendationsCreated = 0;
                foreach (var property in similarProperties)
                {
                    // Verificar se já existe recomendação
                    var exists = await _context.PropertyRecommendations
                        .AnyAsync(r => r.UserId == userId && r.PropertyId == property.Id, cancellationToken);

                    if (!exists)
                    {
                        var score = await CalculateRecommendationScoreAsync(userId, property, cancellationToken);
                        
                        // Score mais alto para propriedades similares a favoritos
                        score += 15; 
                        
                        if (score >= 65)
                        {
                            await CreateRecommendationAsync(userId, property, Math.Min(score, 100), "similar_favorito", cancellationToken);
                            recommendationsCreated++;
                        }
                    }
                }

                _logger.LogInformation("Created {Count} recommendations based on similar properties for user {UserId}", 
                    recommendationsCreated, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing similar properties for user {UserId}", userId);
            }
        }

        /// <summary>
        /// Processar propriedades existentes que correspondem a uma pesquisa guardada
        /// </summary>
        public async Task ProcessExistingPropertiesForSearchAsync(
            string userId,
            SavedSearch savedSearch,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Processing existing properties for user {UserId} based on search {SearchId}", 
                userId, savedSearch.Id);

            try
            {
                // Encontrar propriedades que correspondem aos critérios da pesquisa
                var matchingProperties = await FindPropertiesMatchingSearchAsync(savedSearch, cancellationToken);

                int recommendationsCreated = 0;
                foreach (var property in matchingProperties)
                {
                    // Verificar se já existe recomendação
                    var exists = await _context.PropertyRecommendations
                        .AnyAsync(r => r.UserId == userId && r.PropertyId == property.Id, cancellationToken);

                    if (!exists)
                    {
                        var score = await CalculateRecommendationScoreAsync(userId, property, cancellationToken);
                        
                        // Score mais alto para propriedades que correspondem exatamente às pesquisas
                        score += 10;
                        
                        if (score >= 70)
                        {
                            await CreateRecommendationAsync(userId, property, Math.Min(score, 100), "similar_pesquisa", cancellationToken);
                            recommendationsCreated++;
                        }
                    }
                }

                _logger.LogInformation("Created {Count} recommendations based on search criteria for user {UserId}", 
                    recommendationsCreated, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing existing properties for search for user {UserId}", userId);
            }
        }

        /// <summary>
        /// Refresh completo das recomendações de um utilizador
        /// </summary>
        public async Task RefreshUserRecommendationsAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Refreshing all recommendations for user {UserId}", userId);

            try
            {
                // 1. Analisar comportamento do utilizador
                var userBehavior = await AnalyzeUserBehaviorAsync(userId, cancellationToken);
                
                if (userBehavior.LastActivityDate < DateTime.UtcNow.AddDays(-60))
                {
                    _logger.LogDebug("User {UserId} inactive for too long, skipping refresh", userId);
                    return;
                }

                // 2. Encontrar propriedades candidatas baseado no perfil
                var candidateProperties = await FindCandidatePropertiesAsync(userBehavior, cancellationToken);

                // 3. Limitar número de recomendações ativas por utilizador
                await CleanupUserRecommendationsAsync(userId, cancellationToken);

                int recommendationsCreated = 0;
                foreach (var property in candidateProperties.Take(20)) // Máximo 20 por refresh
                {
                    // Verificar se já existe recomendação ativa
                    var exists = await _context.PropertyRecommendations
                        .AnyAsync(r => r.UserId == userId && r.PropertyId == property.Id && r.IsActive, cancellationToken);

                    if (!exists)
                    {
                        var score = await CalculateRecommendationScoreAsync(userId, property, cancellationToken);
                        
                        if (score >= 70)
                        {
                            await CreateRecommendationAsync(userId, property, score, "perfil_atualizado", cancellationToken);
                            recommendationsCreated++;
                        }
                    }
                }

                _logger.LogInformation("Refreshed recommendations for user {UserId}: {Count} new recommendations", 
                    userId, recommendationsCreated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing recommendations for user {UserId}", userId);
            }
        }

        /// <summary>
        /// Atualizar preferências do utilizador baseado num favorito
        /// </summary>
        public async Task UpdateUserPreferencesFromFavoriteAsync(
            string userId,
            Property property,
            CancellationToken cancellationToken = default)
        {
            // Este método pode ser expandido para manter um perfil de preferências
            // Por agora, apenas logamos para futuras implementações de ML
            _logger.LogInformation("User {UserId} favorited property: Type={Type}, Location={Location}, Price={Price}, Bedrooms={Bedrooms}", 
                userId, property.Type, property.City, property.Price, property.Bedrooms);
        }

        /// <summary>
        /// Atualizar preferências do utilizador baseado numa pesquisa
        /// </summary>
        public async Task UpdateUserPreferencesFromSearchAsync(
            string userId,
            SavedSearch search,
            CancellationToken cancellationToken = default)
        {
            // Este método pode ser expandido para manter um perfil de preferências
            // Por agora, apenas logamos para futuras implementações de ML
            _logger.LogInformation("User {UserId} saved search: Location={Location}, Type={Type}, PriceRange={MinPrice}-{MaxPrice}, Bedrooms={Bedrooms}", 
                userId, search.Location, search.PropertyType, search.MinPrice, search.MaxPrice, search.Bedrooms);
        }

        /// <summary>
        /// Processar histórico de pesquisa para gerar recomendações
        /// </summary>
        public async Task ProcessSearchHistoryForRecommendationsAsync(
            string userId,
            UserSearchHistory searchHistory,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Processing search history for recommendations - user {UserId}, query '{SearchQuery}'", 
                userId, searchHistory.SearchQuery);

            try
            {
                // Se a pesquisa retornou resultados, analisar para futuras recomendações
                if (searchHistory.ResultsCount > 0)
                {
                    // Analisar filtros aplicados
                    var filters = searchHistory.GetFilters();
                    if (filters != null)
                    {
                        await ProcessFiltersForRecommendationsAsync(userId, filters, cancellationToken);
                    }

                    // Trigger refresh de recomendações baseado no novo padrão de pesquisa
                    // Fazer refresh apenas se utilizador fez pesquisas variadas recentemente
                    var recentSearches = await _context.UserSearchHistories
                        .Where(h => h.UserId == userId && h.CreatedAt > DateTime.UtcNow.AddDays(-7))
                        .CountAsync(cancellationToken);

                    if (recentSearches >= 3) // Se fez 3+ pesquisas nos últimos 7 dias
                    {
                        await RefreshUserRecommendationsAsync(userId, cancellationToken);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing search history for recommendations for user {UserId}", userId);
            }
        }

        private async Task ProcessFiltersForRecommendationsAsync(
            string userId,
            Dictionary<string, object> filters,
            CancellationToken cancellationToken)
        {
            // Log dos filtros aplicados para análise comportamental
            _logger.LogInformation("User {UserId} applied filters: {Filters}", 
                userId, System.Text.Json.JsonSerializer.Serialize(filters));

            // Aqui poderíamos implementar lógica mais avançada para:
            // - Detectar mudanças nas preferências
            // - Identificar novos interesses
            // - Ajustar scoring baseado em padrões de filtros
        }

        // MÉTODOS AUXILIARES PARA OS NOVOS RECURSOS

        private async Task<List<Property>> FindSimilarPropertiesAsync(
            Property referenceProperty,
            CancellationToken cancellationToken)
        {
            var query = _context.Properties.Where(p => p.Id != referenceProperty.Id && p.Price.HasValue);

            // Critério 1: Mesma cidade
            var sameCityProperties = query.Where(p => p.City == referenceProperty.City);

            // Critério 2: Mesmo tipo
            if (!string.IsNullOrEmpty(referenceProperty.Type))
            {
                sameCityProperties = sameCityProperties.Where(p => p.Type == referenceProperty.Type);
            }

            // Critério 3: Preço similar (±30%)
            if (referenceProperty.Price.HasValue)
            {
                var minPrice = referenceProperty.Price.Value * 0.7m;
                var maxPrice = referenceProperty.Price.Value * 1.3m;
                sameCityProperties = sameCityProperties.Where(p => p.Price >= minPrice && p.Price <= maxPrice);
            }

            // Critério 4: Quartos similares (±1)
            if (referenceProperty.Bedrooms.HasValue)
            {
                var minBedrooms = Math.Max(1, referenceProperty.Bedrooms.Value - 1);
                var maxBedrooms = referenceProperty.Bedrooms.Value + 1;
                sameCityProperties = sameCityProperties.Where(p => 
                    !p.Bedrooms.HasValue || (p.Bedrooms >= minBedrooms && p.Bedrooms <= maxBedrooms));
            }

            return await sameCityProperties.Take(10).ToListAsync(cancellationToken);
        }

        private async Task<List<Property>> FindPropertiesMatchingSearchAsync(
            SavedSearch search,
            CancellationToken cancellationToken)
        {
            var query = _context.Properties.Where(p => p.Price.HasValue);

            // Aplicar filtros da pesquisa
            if (!string.IsNullOrEmpty(search.Location))
            {
                query = query.Where(p => p.City != null && p.City.Contains(search.Location));
            }

            if (!string.IsNullOrEmpty(search.PropertyType) && search.PropertyType != "any")
            {
                query = query.Where(p => p.Type == search.PropertyType);
            }

            if (search.MinPrice.HasValue)
            {
                query = query.Where(p => p.Price >= search.MinPrice);
            }

            if (search.MaxPrice.HasValue)
            {
                query = query.Where(p => p.Price <= search.MaxPrice);
            }

            if (search.Bedrooms.HasValue)
            {
                query = query.Where(p => p.Bedrooms >= search.Bedrooms);
            }

            if (search.Bathrooms.HasValue)
            {
                query = query.Where(p => p.Bathrooms >= search.Bathrooms);
            }

            if (search.HasGarage)
            {
                query = query.Where(p => p.Garage);
            }

            return await query.Take(15).ToListAsync(cancellationToken);
        }

        private async Task<List<Property>> FindCandidatePropertiesAsync(
            UserBehaviorAnalysis behavior,
            CancellationToken cancellationToken)
        {
            var query = _context.Properties.Where(p => p.Price.HasValue);

            // Filtrar por localizações preferidas
            if (behavior.PreferredLocations.Any())
            {
                query = query.Where(p => behavior.PreferredLocations.Any(loc => 
                    p.City != null && p.City.Contains(loc)));
            }

            // Filtrar por tipos preferidos
            if (behavior.PreferredTypes.Any())
            {
                query = query.Where(p => behavior.PreferredTypes.Contains(p.Type ?? ""));
            }

            // Filtrar por orçamento (±40% do orçamento médio)
            if (behavior.AveragePriceBudget > 0)
            {
                var minPrice = behavior.AveragePriceBudget * 0.6m;
                var maxPrice = behavior.AveragePriceBudget * 1.4m;
                query = query.Where(p => p.Price >= minPrice && p.Price <= maxPrice);
            }

            // Filtrar por quartos preferidos
            if (behavior.PreferredBedrooms.HasValue)
            {
                var minBedrooms = Math.Max(1, behavior.PreferredBedrooms.Value - 1);
                var maxBedrooms = behavior.PreferredBedrooms.Value + 2;
                query = query.Where(p => !p.Bedrooms.HasValue || 
                    (p.Bedrooms >= minBedrooms && p.Bedrooms <= maxBedrooms));
            }

            // Preferência por garagem
            if (behavior.PrefersGarage)
            {
                query = query.Where(p => p.Garage);
            }

            return await query.OrderByDescending(p => p.CreatedAt).Take(50).ToListAsync(cancellationToken);
        }

        private async Task CleanupUserRecommendationsAsync(
            string userId,
            CancellationToken cancellationToken)
        {
            // Manter apenas as 30 recomendações mais recentes e ativas
            var allRecommendations = await _context.PropertyRecommendations
                .Where(r => r.UserId == userId && r.IsActive)
                .OrderByDescending(r => r.Score)
                .ThenByDescending(r => r.CreatedAt)
                .ToListAsync(cancellationToken);

            if (allRecommendations.Count > 30)
            {
                var toDeactivate = allRecommendations.Skip(30).ToList();
                foreach (var rec in toDeactivate)
                {
                    rec.IsActive = false;
                    rec.UpdatedAt = DateTime.UtcNow;
                }
                await _context.SaveChangesAsync(cancellationToken);
                
                _logger.LogDebug("Deactivated {Count} old recommendations for user {UserId}", 
                    toDeactivate.Count, userId);
            }
        }

        // MÉTODOS EXISTENTES (mantidos)

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
                    Reason = GetReasonText(r.Reason),
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
            // Pesquisas guardadas
            var searches = await _context.SavedSearches
                .Where(s => s.UserId == userId && s.CreatedAt > DateTime.UtcNow.AddDays(-60))
                .ToListAsync(cancellationToken);

            // Favoritos
            var favorites = await _context.Favorites
                .Include(f => f.Property)
                .Where(f => f.UserId == userId)
                .ToListAsync(cancellationToken);

            // NOVO: Histórico de pesquisas em tempo real
            var searchHistories = await _context.UserSearchHistories
                .Where(h => h.UserId == userId && h.CreatedAt > DateTime.UtcNow.AddDays(-30))
                .ToListAsync(cancellationToken);

            return new UserBehaviorAnalysis
            {
                PreferredLocations = ExtractPreferredLocations(searches, favorites, searchHistories),
                PreferredTypes = ExtractPreferredTypes(searches, favorites, searchHistories),
                AveragePriceBudget = CalculateAverageBudget(searches, favorites, searchHistories),
                PreferredBedrooms = ExtractPreferredBedrooms(searches, favorites, searchHistories),
                PrefersGarage = ExtractGaragePreference(favorites, searchHistories),
                LastActivityDate = GetLastActivityDate(searches, favorites, searchHistories)
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
        private List<string> ExtractPreferredLocations(List<SavedSearch> searches, List<Favorite> favorites, List<UserSearchHistory> searchHistories)
        {
            var locations = new List<string>();

            // De pesquisas guardadas
            locations.AddRange(searches.Where(s => !string.IsNullOrEmpty(s.Location)).Select(s => s.Location!));

            // De favoritos
            locations.AddRange(favorites.Where(f => !string.IsNullOrEmpty(f.Property.City)).Select(f => f.Property.City!));

            // NOVO: De histórico de pesquisas
            foreach (var history in searchHistories)
            {
                var filters = history.GetFilters();
                if (filters != null && filters.TryGetValue("location", out var locationObj))
                {
                    var location = locationObj?.ToString();
                    if (!string.IsNullOrEmpty(location))
                    {
                        locations.Add(location);
                    }
                }
            }

            return locations.GroupBy(l => l, StringComparer.OrdinalIgnoreCase)
                           .OrderByDescending(g => g.Count())
                           .Select(g => g.Key)
                           .Take(5)
                           .ToList();
        }

        private List<string> ExtractPreferredTypes(List<SavedSearch> searches, List<Favorite> favorites, List<UserSearchHistory> searchHistories)
        {
            var types = new List<string>();

            // De pesquisas guardadas
            types.AddRange(searches.Where(s => !string.IsNullOrEmpty(s.PropertyType) && s.PropertyType != "any").Select(s => s.PropertyType!));

            // De favoritos
            types.AddRange(favorites.Where(f => !string.IsNullOrEmpty(f.Property.Type)).Select(f => f.Property.Type!));

            // NOVO: De histórico de pesquisas
            foreach (var history in searchHistories)
            {
                var filters = history.GetFilters();
                if (filters != null && filters.TryGetValue("type", out var typeObj))
                {
                    var type = typeObj?.ToString();
                    if (!string.IsNullOrEmpty(type) && type != "any")
                    {
                        types.Add(type);
                    }
                }
            }

            return types.GroupBy(t => t, StringComparer.OrdinalIgnoreCase)
                       .OrderByDescending(g => g.Count())
                       .Select(g => g.Key)
                       .Take(3)
                       .ToList();
        }

        private decimal CalculateAverageBudget(List<SavedSearch> searches, List<Favorite> favorites, List<UserSearchHistory> searchHistories)
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

            // NOVO: De histórico de pesquisas
            foreach (var history in searchHistories)
            {
                var filters = history.GetFilters();
                if (filters != null)
                {
                    decimal? minPrice = null, maxPrice = null;

                    if (filters.TryGetValue("min_price", out var minObj) && decimal.TryParse(minObj?.ToString(), out var min))
                        minPrice = min;

                    if (filters.TryGetValue("max_price", out var maxObj) && decimal.TryParse(maxObj?.ToString(), out var max))
                        maxPrice = max;

                    if (minPrice.HasValue || maxPrice.HasValue)
                    {
                        var calculatedPrice = ((minPrice ?? 0) + (maxPrice ?? 1000000)) / 2;
                        prices.Add(calculatedPrice);
                    }
                }
            }

            return prices.Any() ? prices.Average() : 0;
        }

        private int? ExtractPreferredBedrooms(List<SavedSearch> searches, List<Favorite> favorites, List<UserSearchHistory> searchHistories)
        {
            var bedrooms = new List<int>();

            // De pesquisas guardadas
            bedrooms.AddRange(searches.Where(s => s.Bedrooms.HasValue).Select(s => s.Bedrooms!.Value));

            // De favoritos
            bedrooms.AddRange(favorites.Where(f => f.Property.Bedrooms.HasValue).Select(f => f.Property.Bedrooms!.Value));

            // NOVO: De histórico de pesquisas
            foreach (var history in searchHistories)
            {
                var filters = history.GetFilters();
                if (filters != null && filters.TryGetValue("rooms", out var roomsObj) && int.TryParse(roomsObj?.ToString(), out var rooms))
                {
                    bedrooms.Add(rooms);
                }
            }

            return bedrooms.Any() ? (int)bedrooms.Average() : null;
        }

        private bool ExtractGaragePreference(List<Favorite> favorites, List<UserSearchHistory> searchHistories)
        {
            var garageCount = favorites.Count(f => f.Property.Garage);
            var totalFavorites = favorites.Count;

            // Analisar também pesquisas por garagem
            var garageSearches = 0;
            var totalSearches = searchHistories.Count;

            foreach (var history in searchHistories)
            {
                if (history.SearchQuery.Contains("garagem", StringComparison.OrdinalIgnoreCase))
                {
                    garageSearches++;
                }
            }

            var favoritePreference = totalFavorites > 0 && (garageCount / (double)totalFavorites) > 0.5;
            var searchPreference = totalSearches > 0 && (garageSearches / (double)totalSearches) > 0.3;

            return favoritePreference || searchPreference;
        }

        private DateTime GetLastActivityDate(List<SavedSearch> searches, List<Favorite> favorites, List<UserSearchHistory> searchHistories)
        {
            var dates = new List<DateTime>();

            dates.AddRange(searches.Select(s => s.CreatedAt));
            dates.AddRange(favorites.Select(f => f.CreatedAt));
            dates.AddRange(searchHistories.Select(h => h.CreatedAt)); // NOVO

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
            "perfil_atualizado" => "Baseado no perfil atualizado",
            _ => "Recomendação personalizada"
        };
    }
}