using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Application.Common.Events;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Application.Recommendations;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Events;

namespace realestate_ia_site.Server.Infrastructure.Events
{
    public class UserBehaviorEventHandler : 
        IDomainEventHandler<FavoriteAddedEvent>,
        IDomainEventHandler<SavedSearchCreatedEvent>,
        IDomainEventHandler<SearchExecutedEvent>
    {
        private readonly PropertyRecommendationService _recommendationService;
        private readonly IApplicationDbContext _context;
        private readonly ILogger<UserBehaviorEventHandler> _logger;

        public UserBehaviorEventHandler(
            PropertyRecommendationService recommendationService,
            IApplicationDbContext context,
            ILogger<UserBehaviorEventHandler> logger)
        {
            _recommendationService = recommendationService;
            _context = context;
            _logger = logger;
        }

        public async Task HandleAsync(FavoriteAddedEvent domainEvent, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Handling FavoriteAddedEvent for user {UserId}, property {PropertyId}", 
                domainEvent.UserId, domainEvent.PropertyId);

            try
            {
                // 1. Gerar recomendações baseadas na propriedade favoritada
                await _recommendationService.ProcessSimilarPropertiesAsync(
                    domainEvent.UserId, domainEvent.Property, cancellationToken);

                // 2. Atualizar perfil de preferências do utilizador
                await _recommendationService.UpdateUserPreferencesFromFavoriteAsync(
                    domainEvent.UserId, domainEvent.Property, cancellationToken);

                _logger.LogInformation("Successfully processed favorite addition for user {UserId}", domainEvent.UserId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing favorite addition for user {UserId}", domainEvent.UserId);
                throw;
            }
        }

        public async Task HandleAsync(SavedSearchCreatedEvent domainEvent, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Handling SavedSearchCreatedEvent for user {UserId}, search {SearchId}", 
                domainEvent.UserId, domainEvent.SavedSearch.Id);

            try
            {
                // 1. Encontrar propriedades existentes que correspondem aos critérios
                await _recommendationService.ProcessExistingPropertiesForSearchAsync(
                    domainEvent.UserId, domainEvent.SavedSearch, cancellationToken);

                // 2. Atualizar perfil de preferências do utilizador
                await _recommendationService.UpdateUserPreferencesFromSearchAsync(
                    domainEvent.UserId, domainEvent.SavedSearch, cancellationToken);

                _logger.LogInformation("Successfully processed saved search creation for user {UserId}", domainEvent.UserId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing saved search creation for user {UserId}", domainEvent.UserId);
                throw;
            }
        }

        public async Task HandleAsync(SearchExecutedEvent domainEvent, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Handling SearchExecutedEvent for user {UserId}, query '{SearchQuery}'", 
                domainEvent.UserId ?? "anonymous", domainEvent.SearchQuery);

            try
            {
                // 1. Guardar histórico de pesquisa
                var searchHistory = new UserSearchHistory
                {
                    UserId = domainEvent.UserId,
                    SessionId = domainEvent.SessionId,
                    SearchQuery = domainEvent.SearchQuery,
                    ResultsCount = domainEvent.ResultsCount,
                    IpAddress = domainEvent.IpAddress,
                    CreatedAt = DateTime.UtcNow
                };

                if (domainEvent.Filters != null)
                {
                    searchHistory.SetFilters(domainEvent.Filters);
                }

                _context.UserSearchHistories.Add(searchHistory);
                await _context.SaveChangesAsync(cancellationToken);

                // 2. Se for utilizador autenticado, processar para recomendações
                if (!string.IsNullOrEmpty(domainEvent.UserId))
                {
                    await _recommendationService.ProcessSearchHistoryForRecommendationsAsync(
                        domainEvent.UserId, searchHistory, cancellationToken);
                }

                _logger.LogInformation("Successfully processed search execution for user {UserId}", 
                    domainEvent.UserId ?? "anonymous");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing search execution for user {UserId}", 
                    domainEvent.UserId ?? "anonymous");
                throw;
            }
        }
    }
}