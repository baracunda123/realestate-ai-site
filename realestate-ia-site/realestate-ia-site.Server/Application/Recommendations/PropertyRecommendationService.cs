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

                // 2. Verificar se tem favoritos
                var hasFavorites = await _context.Favorites
                    .AnyAsync(f => f.UserId == userId, cancellationToken);

                // 3. Definir threshold baseado em ter favoritos ou não
                // Se NÃO tem favoritos, aceitar scores MUITO mais baixos (pesquisas dominam)
                int scoreThreshold = hasFavorites ? 70 : 50;  // 50 sem favoritos, 70 com favoritos
                
                _logger.LogInformation("User {UserId} has favorites: {HasFavorites}, using score threshold: {Threshold}", 
                    userId, hasFavorites, scoreThreshold);

                // Log detalhado do perfil do utilizador
                _logger.LogInformation(
                    "User {UserId} behavior profile: Locations={Locations}, Types={Types}, AvgBudget={Budget}, Bedrooms={Bedrooms}", 
                    userId,
                    string.Join(", ", userBehavior.PreferredLocations),
                    string.Join(", ", userBehavior.PreferredTypes),
                    userBehavior.AveragePriceBudget,
                    userBehavior.PreferredBedrooms);

                // 4. Encontrar propriedades candidatas baseado no perfil
                var candidateProperties = await FindCandidatePropertiesAsync(userBehavior, cancellationToken);

                _logger.LogInformation("Found {Count} candidate properties for user {UserId}", 
                    candidateProperties.Count, userId);

                if (candidateProperties.Count == 0)
                {
                    _logger.LogWarning("No candidate properties found for user {UserId} - profile may be too restrictive", userId);
                    return;
                }

                // 5. Limitar número de recomendações ativas por utilizador
                await CleanupUserRecommendationsAsync(userId, cancellationToken);

                int recommendationsCreated = 0;
                int propertiesEvaluated = 0;
                
                foreach (var property in candidateProperties.Take(20)) // Máximo 20 por refresh
                {
                    propertiesEvaluated++;
                    
                    // Verificar se já existe recomendação ativa
                    var exists = await _context.PropertyRecommendations
                        .AnyAsync(r => r.UserId == userId && r.PropertyId == property.Id && r.IsActive, cancellationToken);

                    if (!exists)
                    {
                        var score = await CalculateRecommendationScoreAsync(userId, property, cancellationToken);
                        
                        _logger.LogDebug("Property {PropertyId} scored {Score} for user {UserId} (threshold: {Threshold})", 
                            property.Id, score, userId, scoreThreshold);
                        
                        if (score >= scoreThreshold)
                        {
                            await CreateRecommendationAsync(userId, property, score, "perfil_atualizado", cancellationToken);
                            recommendationsCreated++;
                        }
                    }
                }

                _logger.LogInformation(
                    "Refresh completed for user {UserId}: Evaluated {Evaluated} properties, created {Created} new recommendations", 
                    userId, propertiesEvaluated, recommendationsCreated);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing recommendations for user {UserId}", userId);
            }
        }

        /// <summary>
        /// Invalidar recomendações relacionadas com favorito removido
        /// </summary>
        public async Task InvalidateRecommendationsForRemovedFavoriteAsync(
            string userId,
            string removedPropertyId,
            Property? removedProperty,
            CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Invalidating recommendations for removed favorite - user {UserId}, property {PropertyId}", 
                userId, removedPropertyId);

            try
            {
                if (removedProperty == null)
                {
                    _logger.LogWarning("Cannot invalidate recommendations - removed property is null");
                    return;
                }

                // 1. Desativar recomendações diretamente relacionadas com este favorito
                var directRecommendations = await _context.PropertyRecommendations
                    .Where(r => r.UserId == userId && 
                               r.PropertyId == removedPropertyId && 
                               r.IsActive)
                    .ToListAsync(cancellationToken);

                foreach (var rec in directRecommendations)
                {
                    rec.IsActive = false;
                    rec.UpdatedAt = DateTime.UtcNow;
                }

                // 2. Desativar recomendações similares baseadas neste favorito
                var similarRecommendations = await _context.PropertyRecommendations
                    .Include(r => r.Property)
                    .Where(r => r.UserId == userId && 
                               r.IsActive &&
                               r.Reason == "similar_favorito")
                    .ToListAsync(cancellationToken);

                // Filtrar recomendações que eram similares ao favorito removido
                var toDeactivate = similarRecommendations
                    .Where(r => IsSimilarProperty(r.Property, removedProperty))
                    .ToList();

                foreach (var rec in toDeactivate)
                {
                    rec.IsActive = false;
                    rec.UpdatedAt = DateTime.UtcNow;
                }

                // 3. Reduzir score de recomendações da mesma localização
                var locationRecommendations = await _context.PropertyRecommendations
                    .Include(r => r.Property)
                    .Where(r => r.UserId == userId && 
                               r.IsActive &&
                               r.Property.City == removedProperty.City)
                    .ToListAsync(cancellationToken);

                foreach (var rec in locationRecommendations)
                {
                    // Reduzir score em 20 pontos
                    rec.Score = Math.Max(0, rec.Score - 20);
                    rec.UpdatedAt = DateTime.UtcNow;
                    
                    // Se score ficar muito baixo, desativar
                    if (rec.Score < 50)
                    {
                        rec.IsActive = false;
                    }
                }

                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogInformation(
                    "Invalidated recommendations: {DirectCount} direct, {SimilarCount} similar, {LocationCount} location-based", 
                    directRecommendations.Count, 
                    toDeactivate.Count,
                    locationRecommendations.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error invalidating recommendations for removed favorite - user {UserId}", userId);
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
                var recentSearches = await _context.UserSearchHistories
                    .Where(h => h.UserId == userId && h.CreatedAt > DateTime.UtcNow.AddDays(-7))
                    .ToListAsync(cancellationToken);

                var searchCount = recentSearches.Count;

                _logger.LogInformation("User {UserId} has {Count} searches in last 7 days (including current)", 
                    userId, searchCount);

                // Analisar consistência de pesquisas (mesma localização/tipo)
                var currentFilters = searchHistory.GetFilters();
                var currentLocation = currentFilters != null && currentFilters.TryGetValue("location", out var locObj) 
                    ? locObj?.ToString() 
                    : null;
                
                // Contar quantas pesquisas recentes são da mesma localização
                int consistentLocationSearches = 0;
                if (!string.IsNullOrEmpty(currentLocation))
                {
                    consistentLocationSearches = recentSearches.Count(h =>
                    {
                        var filters = h.GetFilters();
                        if (filters == null) return false;
                        
                        if (filters.TryGetValue("location", out var loc))
                        {
                            var locationStr = loc?.ToString();
                            return !string.IsNullOrEmpty(locationStr) && 
                                   locationStr.Equals(currentLocation, StringComparison.OrdinalIgnoreCase);
                        }
                        return false;
                    });
                    
                    _logger.LogInformation("User {UserId} has {ConsistentCount} consistent searches for location '{Location}'", 
                        userId, consistentLocationSearches, currentLocation);
                }

                // NOVA LÓGICA: Mais agressiva e baseada em padrões
                bool shouldRefresh = false;
                string refreshReason = "";

                // Cenário 1: Múltiplas pesquisas consistentes (2+ pela mesma localização)
                if (consistentLocationSearches >= 2)
                {
                    shouldRefresh = true;
                    refreshReason = $"Consistent interest in location '{currentLocation}' ({consistentLocationSearches} searches)";
                }
                // Cenário 2: 3+ pesquisas em geral (interesse ativo)
                else if (searchCount >= 3)
                {
                    shouldRefresh = true;
                    refreshReason = $"Active user with {searchCount} recent searches";
                }
                // Cenário 3: Mudança de localização detectada
                else if (searchCount >= 2 && !string.IsNullOrEmpty(currentLocation))
                {
                    var previousLocation = recentSearches
                        .OrderByDescending(h => h.CreatedAt)
                        .Skip(1) // Pular a pesquisa atual
                        .FirstOrDefault()?
                        .GetFilters()?
                        .TryGetValue("location", out var prevLoc) == true ? prevLoc?.ToString() : null;

                    if (!string.IsNullOrEmpty(previousLocation) && 
                        !currentLocation.Equals(previousLocation, StringComparison.OrdinalIgnoreCase))
                    {
                        shouldRefresh = true;
                        refreshReason = $"Location change detected: '{previousLocation}' -> '{currentLocation}'";
                    }
                }

                if (shouldRefresh)
                {
                    _logger.LogInformation("Triggering recommendations refresh for user {UserId}: {Reason}", 
                        userId, refreshReason);
                    await RefreshUserRecommendationsAsync(userId, cancellationToken);
                }
                else if (searchCount == 1)
                {
                    // Primeira pesquisa: criar recomendações iniciais
                    _logger.LogInformation("User {UserId} first search detected - creating initial recommendations", userId);
                    await CreateInitialRecommendationsFromSearchAsync(userId, searchHistory, cancellationToken);
                }
                else
                {
                    // Qualquer outro caso: tentar atualizar/expandir recomendações
                    _logger.LogInformation("User {UserId} updating recommendations from search #{Count}", userId, searchCount);
                    await UpdateRecommendationsFromSearchAsync(userId, searchHistory, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing search history for recommendations for user {UserId}", userId);
            }
        }

        /// <summary>
        /// Criar recomendações iniciais baseadas na primeira pesquisa do utilizador
        /// </summary>
        private async Task CreateInitialRecommendationsFromSearchAsync(
            string userId,
            UserSearchHistory searchHistory,
            CancellationToken cancellationToken)
        {
            try
            {
                var filters = searchHistory.GetFilters();
                
                // Criar comportamento sintético baseado na pesquisa
                var syntheticBehavior = new UserBehaviorAnalysis
                {
                    PreferredLocations = new List<string>(),
                    PreferredTypes = new List<string>(),
                    AveragePriceBudget = 0,
                    PreferredBedrooms = null,
                    PrefersGarage = false,
                    LastActivityDate = DateTime.UtcNow
                };

                // Extrair localização dos filtros
                if (filters != null && filters.TryGetValue("location", out var locationObj))
                {
                    var location = locationObj?.ToString();
                    if (!string.IsNullOrEmpty(location))
                    {
                        syntheticBehavior.PreferredLocations.Add(location);
                    }
                }

                // Extrair tipo dos filtros
                if (filters != null && filters.TryGetValue("type", out var typeObj))
                {
                    var type = typeObj?.ToString();
                    if (!string.IsNullOrEmpty(type) && type != "any")
                    {
                        syntheticBehavior.PreferredTypes.Add(type);
                    }
                }

                // Extrair orçamento dos filtros
                if (filters != null)
                {
                    decimal? minPrice = null, maxPrice = null;
                    
                    if (filters.TryGetValue("min_price", out var minObj) && decimal.TryParse(minObj?.ToString(), out var min))
                        minPrice = min;
                    
                    if (filters.TryGetValue("max_price", out var maxObj) && decimal.TryParse(maxObj?.ToString(), out var max))
                        maxPrice = max;
                    
                    if (minPrice.HasValue || maxPrice.HasValue)
                    {
                        syntheticBehavior.AveragePriceBudget = ((minPrice ?? 0) + (maxPrice ?? 1000000)) / 2;
                    }
                }

                // Extrair quartos dos filtros
                if (filters != null && filters.TryGetValue("rooms", out var roomsObj) && int.TryParse(roomsObj?.ToString(), out var rooms))
                {
                    syntheticBehavior.PreferredBedrooms = rooms;
                }

                // Buscar propriedades candidatas
                var candidates = await FindCandidatePropertiesAsync(syntheticBehavior, cancellationToken);
                
                // Criar até 5 recomendações iniciais com score mais baixo
                int created = 0;
                foreach (var property in candidates.Take(5))
                {
                    var score = 60; // Score base para primeira pesquisa
                    
                    // Bonus se match com localização
                    if (syntheticBehavior.PreferredLocations.Any() && 
                        syntheticBehavior.PreferredLocations.Contains(property.City ?? "", StringComparer.OrdinalIgnoreCase))
                    {
                        score += 10;
                    }
                    
                    // Bonus se match com tipo
                    if (syntheticBehavior.PreferredTypes.Any() && 
                        syntheticBehavior.PreferredTypes.Contains(property.Type ?? "", StringComparer.OrdinalIgnoreCase))
                    {
                        score += 10;
                    }
                    
                    await CreateRecommendationAsync(userId, property, score, "primeira_pesquisa", cancellationToken);
                    created++;
                }

                _logger.LogInformation("Created {Count} initial recommendations for user {UserId} from first search", 
                    created, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating initial recommendations for user {UserId}", userId);
            }
        }

        /// <summary>
        /// Atualizar recomendações baseadas numa nova pesquisa (segunda pesquisa)
        /// </summary>
        private async Task UpdateRecommendationsFromSearchAsync(
            string userId,
            UserSearchHistory searchHistory,
            CancellationToken cancellationToken)
        {
            try
            {
                var filters = searchHistory.GetFilters();
                
                _logger.LogInformation("User {UserId} search preferences: Query='{Query}', Filters={Filters}", 
                    userId, 
                    searchHistory.SearchQuery,
                    filters != null ? System.Text.Json.JsonSerializer.Serialize(filters) : "none");
                
                // Criar comportamento combinando esta pesquisa com a anterior
                var existingBehavior = await AnalyzeUserBehaviorAsync(userId, cancellationToken);
                
                // IMPORTANTE: Desativar recomendações antigas com scores baixos
                var oldRecommendations = await _context.PropertyRecommendations
                    .Where(r => r.UserId == userId && r.IsActive && r.Score < 70)
                    .ToListAsync(cancellationToken);

                foreach (var rec in oldRecommendations)
                {
                    rec.IsActive = false;
                    rec.UpdatedAt = DateTime.UtcNow;
                }

                _logger.LogInformation("Deactivated {Count} low-score recommendations before creating new ones", 
                    oldRecommendations.Count);
                
                // Buscar mais propriedades candidatas
                var candidates = await FindCandidatePropertiesAsync(existingBehavior, cancellationToken);
                
                // Adicionar até 10 novas recomendações
                int created = 0;
                foreach (var property in candidates.Take(10))
                {
                    var exists = await _context.PropertyRecommendations
                        .AnyAsync(r => r.UserId == userId && r.PropertyId == property.Id, cancellationToken);
                    
                    if (!exists)
                    {
                        var score = await CalculateRecommendationScoreAsync(userId, property, cancellationToken);
                        
                        if (score >= 65) // Score ligeiramente mais baixo para segunda pesquisa
                        {
                            await CreateRecommendationAsync(userId, property, score, "pesquisa_recente", cancellationToken);
                            created++;
                        }
                    }
                }

                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("Created {Count} updated recommendations for user {UserId} from second search", 
                    created, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating recommendations for user {UserId}", userId);
            }
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

        private async Task<List<Property>> FindCandidatePropertiesAsync(
            UserBehaviorAnalysis behavior,
            CancellationToken cancellationToken)
        {
            var query = _context.Properties.Where(p => p.Price.HasValue);
            int initialCount = await query.CountAsync(cancellationToken);

            _logger.LogDebug("FindCandidateProperties: Starting with {Count} properties with price", initialCount);

            // Filtrar por localizações preferidas (se houver)
            if (behavior.PreferredLocations.Any())
            {
                _logger.LogDebug("Filtering by preferred locations: {Locations}", 
                    string.Join(", ", behavior.PreferredLocations));
                
                query = query.Where(p => behavior.PreferredLocations.Any(loc => 
                    p.City != null && p.City.Contains(loc)));
                
                int afterLocationFilter = await query.CountAsync(cancellationToken);
                _logger.LogDebug("After location filter: {Count} properties remain", afterLocationFilter);
            }
            else
            {
                _logger.LogDebug("No preferred locations - not filtering by location");
            }

            // Filtrar por tipos preferidos (se houver)
            if (behavior.PreferredTypes.Any())
            {
                _logger.LogDebug("Filtering by preferred types: {Types}", 
                    string.Join(", ", behavior.PreferredTypes));
                
                query = query.Where(p => behavior.PreferredTypes.Contains(p.Type ?? ""));
                
                int afterTypeFilter = await query.CountAsync(cancellationToken);
                _logger.LogDebug("After type filter: {Count} properties remain", afterTypeFilter);
            }
            else
            {
                _logger.LogDebug("No preferred types - not filtering by type");
            }

            // Filtrar por orçamento (±50% do orçamento médio - MAIS FLEXÍVEL)
            if (behavior.AveragePriceBudget > 0)
            {
                var minPrice = behavior.AveragePriceBudget * 0.5m;  // Era 0.6m - agora mais flexível
                var maxPrice = behavior.AveragePriceBudget * 1.5m;  // Era 1.4m - agora mais flexível
                
                _logger.LogDebug("Filtering by budget: {MinPrice:N2} - {MaxPrice:N2} (avg: {AvgBudget:N2})", 
                    minPrice, maxPrice, behavior.AveragePriceBudget);
                
                query = query.Where(p => p.Price >= minPrice && p.Price <= maxPrice);
                
                int afterBudgetFilter = await query.CountAsync(cancellationToken);
                _logger.LogDebug("After budget filter: {Count} properties remain", afterBudgetFilter);
            }
            else
            {
                _logger.LogDebug("No budget preference - not filtering by price");
            }

            // Filtrar por quartos preferidos (mais flexível)
            if (behavior.PreferredBedrooms.HasValue)
            {
                var minBedrooms = Math.Max(1, behavior.PreferredBedrooms.Value - 1);
                var maxBedrooms = behavior.PreferredBedrooms.Value + 2;
                
                _logger.LogDebug("Filtering by bedrooms: {Min} - {Max} (preferred: {Preferred})", 
                    minBedrooms, maxBedrooms, behavior.PreferredBedrooms.Value);
                
                query = query.Where(p => !p.Bedrooms.HasValue || 
                    (p.Bedrooms >= minBedrooms && p.Bedrooms <= maxBedrooms));
                
                int afterBedroomsFilter = await query.CountAsync(cancellationToken);
                _logger.LogDebug("After bedrooms filter: {Count} properties remain", afterBedroomsFilter);
            }

            // Preferência por garagem (SOFT - não é obrigatório)
            if (behavior.PrefersGarage)
            {
                _logger.LogDebug("User prefers garage - prioritizing properties with garage");
                // NÃO filtrar, apenas usar para scoring
            }

            var result = await query
                .OrderByDescending(p => p.CreatedAt)
                .Take(50)
                .ToListAsync(cancellationToken);

            _logger.LogInformation("FindCandidateProperties: Returning {Count} candidate properties", result.Count);

            return result;
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
                    Link = r.Property.Link,
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

            // Utilizadores com favoritos similares
            var favoriteUsers = await _context.Favorites
                .Include(f => f.Property)
                .Where(f => IsSimilarProperty(f.Property, property))
                .Select(f => f.UserId)
                .ToListAsync(cancellationToken);

            users.UnionWith(favoriteUsers);

            _logger.LogInformation("Found {UserCount} users interested in property {PropertyId} based on favorites", 
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
            var locationScore = CalculateLocationScore(property, userBehavior.PreferredLocations);
            score += locationScore;

            // 2. Preço (25 pontos)
            var priceScore = CalculatePriceScore(property, userBehavior.AveragePriceBudget);
            score += priceScore;

            // 3. Tipo de propriedade (20 pontos)
            var typeScore = CalculateTypeScore(property, userBehavior.PreferredTypes);
            score += typeScore;

            // 4. Características (15 pontos)
            var characteristicsScore = CalculateCharacteristicsScore(property, userBehavior);
            score += characteristicsScore;

            // 5. Tempo/Recência (10 pontos)
            var recencyScore = CalculateRecencyScore(userBehavior.LastActivityDate);
            score += recencyScore;

            _logger.LogDebug(
                "Score breakdown for property {PropertyId} (user {UserId}): Location={Location}, Price={Price}, Type={Type}, Characteristics={Characteristics}, Recency={Recency}, TOTAL={Total}",
                property.Id, userId, locationScore, priceScore, typeScore, characteristicsScore, recencyScore, score);

            return Math.Min(score, 100);
        }

        private async Task<UserBehaviorAnalysis> AnalyzeUserBehaviorAsync(
            string userId,
            CancellationToken cancellationToken)
        {
            // Favoritos
            var favorites = await _context.Favorites
                .Include(f => f.Property)
                .Where(f => f.UserId == userId)
                .ToListAsync(cancellationToken);

            // Histórico de pesquisas em tempo real
            var searchHistories = await _context.UserSearchHistories
                .Where(h => h.UserId == userId && h.CreatedAt > DateTime.UtcNow.AddDays(-30))
                .OrderByDescending(h => h.CreatedAt)
                .ToListAsync(cancellationToken);

            _logger.LogDebug("AnalyzeUserBehavior for user {UserId}: {FavoriteCount} favorites, {SearchCount} recent searches", 
                userId, favorites.Count, searchHistories.Count);

            var preferredLocations = ExtractPreferredLocations(favorites, searchHistories);
            var preferredTypes = ExtractPreferredTypes(favorites, searchHistories);
            var averageBudget = CalculateAverageBudget(favorites, searchHistories);
            var preferredBedrooms = ExtractPreferredBedrooms(favorites, searchHistories);
            var prefersGarage = ExtractGaragePreference(favorites, searchHistories);
            var lastActivityDate = GetLastActivityDate(favorites, searchHistories);

            _logger.LogInformation(
                "User {UserId} behavior analysis: Locations=[{Locations}], Types=[{Types}], Budget={Budget:N2}, Bedrooms={Bedrooms}, Garage={Garage}, LastActivity={LastActivity}",
                userId,
                string.Join(", ", preferredLocations),
                string.Join(", ", preferredTypes),
                averageBudget,
                preferredBedrooms?.ToString() ?? "any",
                prefersGarage,
                lastActivityDate.ToString("yyyy-MM-dd"));

            return new UserBehaviorAnalysis
            {
                PreferredLocations = preferredLocations,
                PreferredTypes = preferredTypes,
                AveragePriceBudget = averageBudget,
                PreferredBedrooms = preferredBedrooms,
                PrefersGarage = prefersGarage,
                LastActivityDate = lastActivityDate
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
        private List<string> ExtractPreferredLocations(List<Favorite> favorites, List<UserSearchHistory> searchHistories)
        {
            var locations = new Dictionary<string, double>(); // Location -> Weight

            // De favoritos (peso 1.5 - mais importante)
            foreach (var favorite in favorites.Where(f => !string.IsNullOrEmpty(f.Property.City)))
            {
                var city = favorite.Property.City!;
                if (!locations.ContainsKey(city))
                    locations[city] = 0;
                locations[city] += 1.5;
            }

            // De histórico de pesquisas (peso baseado na recência)
            var now = DateTime.UtcNow;
            foreach (var history in searchHistories)
            {
                var filters = history.GetFilters();
                if (filters != null && filters.TryGetValue("location", out var locationObj))
                {
                    var location = locationObj?.ToString();
                    if (!string.IsNullOrEmpty(location))
                    {
                        // Peso baseado na recência: pesquisas mais recentes têm maior peso
                        var daysOld = (now - history.CreatedAt).TotalDays;
                        var weight = daysOld <= 7 ? 2.0 :   // Última semana: peso 2.0 (MAIS que favoritos!)
                                    daysOld <= 14 ? 1.5 :   // Últimas 2 semanas: peso 1.5
                                    daysOld <= 21 ? 1.0 :   // Últimas 3 semanas: peso 1.0
                                    0.5;                     // Mais antigas: peso 0.5

                        if (!locations.ContainsKey(location))
                            locations[location] = 0;
                        locations[location] += weight;
                    }
                }
            }

            // Retorna as 5 localizações com maior peso total
            return locations
                .OrderByDescending(kvp => kvp.Value)
                .Take(5)
                .Select(kvp => kvp.Key)
                .ToList();
        }

        private List<string> ExtractPreferredTypes(List<Favorite> favorites, List<UserSearchHistory> searchHistories)
        {
            var types = new Dictionary<string, double>(); // Type -> Weight

            // De favoritos (peso 1.5)
            foreach (var favorite in favorites.Where(f => !string.IsNullOrEmpty(f.Property.Type)))
            {
                var type = favorite.Property.Type!;
                if (!types.ContainsKey(type))
                    types[type] = 0;
                types[type] += 1.5;
            }

            // De histórico de pesquisas (peso baseado na recência)
            var now = DateTime.UtcNow;
            foreach (var history in searchHistories)
            {
                var filters = history.GetFilters();
                if (filters != null && filters.TryGetValue("type", out var typeObj))
                {
                    var type = typeObj?.ToString();
                    if (!string.IsNullOrEmpty(type) && type != "any")
                    {
                        var daysOld = (now - history.CreatedAt).TotalDays;
                        var weight = daysOld <= 7 ? 2.0 :
                                    daysOld <= 14 ? 1.5 :
                                    daysOld <= 21 ? 1.0 :
                                    0.5;

                        if (!types.ContainsKey(type))
                            types[type] = 0;
                        types[type] += weight;
                    }
                }
            }

            return types
                .OrderByDescending(kvp => kvp.Value)
                .Take(3)
                .Select(kvp => kvp.Key)
                .ToList();
        }

        private decimal CalculateAverageBudget(List<Favorite> favorites, List<UserSearchHistory> searchHistories)
        {
            var pricesWithWeights = new List<(decimal Price, double Weight)>();
            var now = DateTime.UtcNow;

            // De favoritos (peso 1.5)
            foreach (var favorite in favorites.Where(f => f.Property.Price.HasValue))
            {
                pricesWithWeights.Add((favorite.Property.Price!.Value, 1.5));
            }

            // De histórico de pesquisas (peso baseado na recência)
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
                        
                        var daysOld = (now - history.CreatedAt).TotalDays;
                        var weight = daysOld <= 7 ? 2.0 :
                                    daysOld <= 14 ? 1.5 :
                                    daysOld <= 21 ? 1.0 :
                                    0.5;

                        pricesWithWeights.Add((calculatedPrice, weight));
                    }
                }
            }

            if (!pricesWithWeights.Any())
                return 0;

            // Média ponderada
            var totalWeight = pricesWithWeights.Sum(p => p.Weight);
            var weightedSum = pricesWithWeights.Sum(p => p.Price * (decimal)p.Weight);
            
            return weightedSum / (decimal)totalWeight;
        }

        private int? ExtractPreferredBedrooms(List<Favorite> favorites, List<UserSearchHistory> searchHistories)
        {
            var bedroomsWithWeights = new List<(int Bedrooms, double Weight)>();
            var now = DateTime.UtcNow;

            // De favoritos (peso 1.5)
            foreach (var favorite in favorites.Where(f => f.Property.Bedrooms.HasValue))
            {
                bedroomsWithWeights.Add((favorite.Property.Bedrooms!.Value, 1.5));
            }

            // De histórico de pesquisas (peso baseado na recência)
            foreach (var history in searchHistories)
            {
                var filters = history.GetFilters();
                if (filters != null && filters.TryGetValue("rooms", out var roomsObj) && int.TryParse(roomsObj?.ToString(), out var rooms))
                {
                    var daysOld = (now - history.CreatedAt).TotalDays;
                    var weight = daysOld <= 7 ? 2.0 :
                                daysOld <= 14 ? 1.5 :
                                daysOld <= 21 ? 1.0 :
                                0.5;

                    bedroomsWithWeights.Add((rooms, weight));
                }
            }

            if (!bedroomsWithWeights.Any())
                return null;

            // Média ponderada arredondada
            var totalWeight = bedroomsWithWeights.Sum(b => b.Weight);
            var weightedSum = bedroomsWithWeights.Sum(b => b.Bedrooms * b.Weight);
            
            return (int)Math.Round(weightedSum / totalWeight);
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

        private DateTime GetLastActivityDate(List<Favorite> favorites, List<UserSearchHistory> searchHistories)
        {
            var dates = new List<DateTime>();

            dates.AddRange(favorites.Select(f => f.CreatedAt));
            dates.AddRange(searchHistories.Select(h => h.CreatedAt));

            return dates.Any() ? dates.Max() : DateTime.UtcNow.AddDays(-365);
        }

        // Métodos auxiliares para matching
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
            "perfil_atualizado" => "Baseado no perfil atualizado",
            "primeira_pesquisa" => "Baseado na sua primeira pesquisa",
            "pesquisa_recente" => "Baseado nas suas pesquisas recentes",
            _ => "Recomendação personalizada"
        };
    }
}