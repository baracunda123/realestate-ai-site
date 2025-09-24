using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.DTOs.SavedSearches;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Application.Common.Exceptions;
using System.Security.Claims;

namespace realestate_ia_site.Server.Controllers
{
    [ApiController]
    [Route("api/saved-searches")]
    [Authorize]
    public class SavedSearchesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<SavedSearchesController> _logger;

        public SavedSearchesController(ApplicationDbContext context, ILogger<SavedSearchesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        private string GetCurrentUserId()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        }

        /// <summary>
        /// Obter todas as pesquisas salvas do usuário
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(SavedSearchesResponse), StatusCodes.Status200OK)]
        public async Task<ActionResult<SavedSearchesResponse>> GetSavedSearches()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            _logger.LogInformation("Getting saved searches for user {UserId}", userId);

            try
            {
                var searches = await _context.SavedSearches
                    .Where(ss => ss.UserId == userId)
                    .OrderByDescending(ss => ss.UpdatedAt)
                    .Select(ss => new SavedSearchDto
                    {
                        Id = ss.Id,
                        Name = ss.Name,
                        Query = ss.Query,
                        Filters = new SavedSearchFiltersDto
                        {
                            Location = ss.Location,
                            PropertyType = ss.PropertyType,
                            PriceRange = ss.MinPrice.HasValue && ss.MaxPrice.HasValue 
                                ? new[] { ss.MinPrice.Value, ss.MaxPrice.Value } 
                                : null,
                            Bedrooms = ss.Bedrooms,
                            Bathrooms = ss.Bathrooms,
                            HasGarage = ss.HasGarage ? ss.HasGarage : null
                        },
                        Results = ss.ResultsCount,
                        NewResults = ss.NewResultsCount,
                        CreatedAt = ss.CreatedAt,
                        UpdatedAt = ss.UpdatedAt,
                        LastExecutedAt = ss.LastExecutedAt,
                        LastViewedAt = ss.LastViewedAt,
                        IsActive = ss.IsActive
                    })
                    .ToListAsync();

                var response = new SavedSearchesResponse
                {
                    Searches = searches,
                    TotalCount = searches.Count,
                    ActiveCount = searches.Count(s => s.IsActive),
                    NewResultsCount = searches.Sum(s => s.NewResults)
                };

                _logger.LogInformation("Found {Count} saved searches for user", searches.Count);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting saved searches for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Obter detalhes de uma pesquisa salva específica
        /// </summary>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(SavedSearchDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<SavedSearchDto>> GetSavedSearchById(string id)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            _logger.LogInformation("Getting saved search {SearchId} for user {UserId}", id, userId);

            try
            {
                var search = await _context.SavedSearches
                    .Where(ss => ss.Id == id && ss.UserId == userId)
                    .Select(ss => new SavedSearchDto
                    {
                        Id = ss.Id,
                        Name = ss.Name,
                        Query = ss.Query,
                        Filters = new SavedSearchFiltersDto
                        {
                            Location = ss.Location,
                            PropertyType = ss.PropertyType,
                            PriceRange = ss.MinPrice.HasValue && ss.MaxPrice.HasValue 
                                ? new[] { ss.MinPrice.Value, ss.MaxPrice.Value } 
                                : null,
                            Bedrooms = ss.Bedrooms,
                            Bathrooms = ss.Bathrooms,
                            HasGarage = ss.HasGarage ? ss.HasGarage : null
                        },
                        Results = ss.ResultsCount,
                        NewResults = ss.NewResultsCount,
                        CreatedAt = ss.CreatedAt,
                        UpdatedAt = ss.UpdatedAt,
                        LastExecutedAt = ss.LastExecutedAt,
                        LastViewedAt = ss.LastViewedAt,
                        IsActive = ss.IsActive
                    })
                    .FirstOrDefaultAsync();

                if (search == null)
                    return NotFound(new { message = "Pesquisa salva não encontrada" });

                return Ok(search);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting saved search {SearchId}", id);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Criar nova pesquisa salva
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(SavedSearchDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<SavedSearchDto>> CreateSavedSearch([FromBody] CreateSavedSearchRequest request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new { message = "Nome é obrigatório" });

            if (string.IsNullOrWhiteSpace(request.Query))
                return BadRequest(new { message = "Query é obrigatória" });

            _logger.LogInformation("Creating saved search '{Name}' for user {UserId}", request.Name, userId);

            try
            {
                var savedSearch = new SavedSearch
                {
                    UserId = userId,
                    Name = request.Name,
                    Query = request.Query,
                    Location = request.Filters.Location,
                    PropertyType = request.Filters.PropertyType,
                    MinPrice = request.Filters.PriceRange?.ElementAtOrDefault(0),
                    MaxPrice = request.Filters.PriceRange?.ElementAtOrDefault(1),
                    Bedrooms = request.Filters.Bedrooms,
                    Bathrooms = request.Filters.Bathrooms,
                    HasGarage = request.Filters.HasGarage ?? false,
                    ResultsCount = request.Results
                };

                _context.SavedSearches.Add(savedSearch);
                await _context.SaveChangesAsync();

                var response = new SavedSearchDto
                {
                    Id = savedSearch.Id,
                    Name = savedSearch.Name,
                    Query = savedSearch.Query,
                    Filters = new SavedSearchFiltersDto
                    {
                        Location = savedSearch.Location,
                        PropertyType = savedSearch.PropertyType,
                        PriceRange = savedSearch.MinPrice.HasValue && savedSearch.MaxPrice.HasValue 
                            ? new[] { savedSearch.MinPrice.Value, savedSearch.MaxPrice.Value } 
                            : null,
                        Bedrooms = savedSearch.Bedrooms,
                        Bathrooms = savedSearch.Bathrooms,
                        HasGarage = savedSearch.HasGarage ? savedSearch.HasGarage : null
                    },
                    Results = savedSearch.ResultsCount,
                    NewResults = savedSearch.NewResultsCount,
                    CreatedAt = savedSearch.CreatedAt,
                    UpdatedAt = savedSearch.UpdatedAt,
                    IsActive = savedSearch.IsActive
                };

                _logger.LogInformation("Saved search created with ID {SearchId}", savedSearch.Id);
                return CreatedAtAction(nameof(GetSavedSearchById), new { id = savedSearch.Id }, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating saved search");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Atualizar pesquisa salva
        /// </summary>
        [HttpPut("{id}")]
        [ProducesResponseType(typeof(SavedSearchDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<SavedSearchDto>> UpdateSavedSearch(string id, [FromBody] UpdateSavedSearchRequest request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            _logger.LogInformation("Updating saved search {SearchId} for user {UserId}", id, userId);

            try
            {
                var savedSearch = await _context.SavedSearches
                    .FirstOrDefaultAsync(ss => ss.Id == id && ss.UserId == userId);

                if (savedSearch == null)
                    return NotFound(new { message = "Pesquisa salva não encontrada" });

                // Update fields if provided
                if (!string.IsNullOrWhiteSpace(request.Name))
                    savedSearch.Name = request.Name;

                if (!string.IsNullOrWhiteSpace(request.Query))
                    savedSearch.Query = request.Query;

                if (request.Filters != null)
                {
                    savedSearch.Location = request.Filters.Location;
                    savedSearch.PropertyType = request.Filters.PropertyType;
                    savedSearch.MinPrice = request.Filters.PriceRange?.ElementAtOrDefault(0);
                    savedSearch.MaxPrice = request.Filters.PriceRange?.ElementAtOrDefault(1);
                    savedSearch.Bedrooms = request.Filters.Bedrooms;
                    savedSearch.Bathrooms = request.Filters.Bathrooms;
                    savedSearch.HasGarage = request.Filters.HasGarage ?? false;
                }

                if (request.IsActive.HasValue)
                    savedSearch.IsActive = request.IsActive.Value;

                savedSearch.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                var response = new SavedSearchDto
                {
                    Id = savedSearch.Id,
                    Name = savedSearch.Name,
                    Query = savedSearch.Query,
                    Filters = new SavedSearchFiltersDto
                    {
                        Location = savedSearch.Location,
                        PropertyType = savedSearch.PropertyType,
                        PriceRange = savedSearch.MinPrice.HasValue && savedSearch.MaxPrice.HasValue 
                            ? new[] { savedSearch.MinPrice.Value, savedSearch.MaxPrice.Value } 
                            : null,
                        Bedrooms = savedSearch.Bedrooms,
                        Bathrooms = savedSearch.Bathrooms,
                        HasGarage = savedSearch.HasGarage ? savedSearch.HasGarage : null
                    },
                    Results = savedSearch.ResultsCount,
                    NewResults = savedSearch.NewResultsCount,
                    CreatedAt = savedSearch.CreatedAt,
                    UpdatedAt = savedSearch.UpdatedAt,
                    LastExecutedAt = savedSearch.LastExecutedAt,
                    LastViewedAt = savedSearch.LastViewedAt,
                    IsActive = savedSearch.IsActive
                };

                _logger.LogInformation("Saved search updated successfully");
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating saved search {SearchId}", id);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Excluir pesquisa salva
        /// </summary>
        [HttpDelete("{id}")]
        [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<SuccessResponse>> DeleteSavedSearch(string id)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            _logger.LogInformation("Deleting saved search {SearchId} for user {UserId}", id, userId);

            try
            {
                var savedSearch = await _context.SavedSearches
                    .FirstOrDefaultAsync(ss => ss.Id == id && ss.UserId == userId);

                if (savedSearch == null)
                    return NotFound(new { message = "Pesquisa salva não encontrada" });

                _context.SavedSearches.Remove(savedSearch);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Saved search deleted successfully");
                return Ok(new SuccessResponse
                {
                    Success = true,
                    Message = "Pesquisa salva excluída com sucesso"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting saved search {SearchId}", id);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Marcar pesquisa como visualizada
        /// </summary>
        [HttpPost("{id}/mark-viewed")]
        [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<SuccessResponse>> MarkAsViewed(string id)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            _logger.LogInformation("Marking saved search {SearchId} as viewed for user {UserId}", id, userId);

            try
            {
                var savedSearch = await _context.SavedSearches
                    .FirstOrDefaultAsync(ss => ss.Id == id && ss.UserId == userId);

                if (savedSearch == null)
                    return NotFound(new { message = "Pesquisa salva não encontrada" });

                savedSearch.MarkAsViewed();
                await _context.SaveChangesAsync();

                _logger.LogInformation("Saved search marked as viewed");
                return Ok(new SuccessResponse
                {
                    Success = true,
                    Message = "Pesquisa marcada como visualizada"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking saved search as viewed {SearchId}", id);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Duplicar pesquisa salva
        /// </summary>
        [HttpPost("{id}/duplicate")]
        [ProducesResponseType(typeof(SavedSearchDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<SavedSearchDto>> DuplicateSavedSearch(string id, [FromBody] DuplicateSearchRequest request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            _logger.LogInformation("Duplicating saved search {SearchId} for user {UserId}", id, userId);

            try
            {
                var originalSearch = await _context.SavedSearches
                    .FirstOrDefaultAsync(ss => ss.Id == id && ss.UserId == userId);

                if (originalSearch == null)
                    return NotFound(new { message = "Pesquisa salva não encontrada" });

                var duplicatedSearch = new SavedSearch
                {
                    UserId = userId,
                    Name = request.NewName ?? $"{originalSearch.Name} (Cópia)",
                    Query = originalSearch.Query,
                    Location = originalSearch.Location,
                    PropertyType = originalSearch.PropertyType,
                    MinPrice = originalSearch.MinPrice,
                    MaxPrice = originalSearch.MaxPrice,
                    Bedrooms = originalSearch.Bedrooms,
                    Bathrooms = originalSearch.Bathrooms,
                    HasGarage = originalSearch.HasGarage
                };

                _context.SavedSearches.Add(duplicatedSearch);
                await _context.SaveChangesAsync();

                var response = new SavedSearchDto
                {
                    Id = duplicatedSearch.Id,
                    Name = duplicatedSearch.Name,
                    Query = duplicatedSearch.Query,
                    Filters = new SavedSearchFiltersDto
                    {
                        Location = duplicatedSearch.Location,
                        PropertyType = duplicatedSearch.PropertyType,
                        PriceRange = duplicatedSearch.MinPrice.HasValue && duplicatedSearch.MaxPrice.HasValue 
                            ? new[] { duplicatedSearch.MinPrice.Value, duplicatedSearch.MaxPrice.Value } 
                            : null,
                        Bedrooms = duplicatedSearch.Bedrooms,
                        Bathrooms = duplicatedSearch.Bathrooms,
                        HasGarage = duplicatedSearch.HasGarage ? duplicatedSearch.HasGarage : null
                    },
                    Results = duplicatedSearch.ResultsCount,
                    NewResults = duplicatedSearch.NewResultsCount,
                    CreatedAt = duplicatedSearch.CreatedAt,
                    UpdatedAt = duplicatedSearch.UpdatedAt,
                    IsActive = duplicatedSearch.IsActive
                };

                _logger.LogInformation("Saved search duplicated with ID {SearchId}", duplicatedSearch.Id);
                return CreatedAtAction(nameof(GetSavedSearchById), new { id = duplicatedSearch.Id }, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error duplicating saved search {SearchId}", id);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Obter estatísticas das pesquisas salvas (simplificadas)
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(SavedSearchStatsResponse), StatusCodes.Status200OK)]
        public async Task<ActionResult<SavedSearchStatsResponse>> GetStats()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            _logger.LogInformation("Getting saved search stats for user {UserId}", userId);

            try
            {
                var searches = await _context.SavedSearches
                    .Where(ss => ss.UserId == userId)
                    .ToListAsync();

                var mostSuccessful = searches
                    .Where(s => s.ResultsCount > 0)
                    .OrderByDescending(s => s.ResultsCount)
                    .FirstOrDefault();

                // Simplified recent activity without executions table
                var recentActivity = searches
                    .Where(s => s.LastExecutedAt.HasValue)
                    .OrderByDescending(s => s.LastExecutedAt)
                    .Take(10)
                    .Select(s => new RecentActivityDto
                    {
                        SearchId = s.Id,
                        SearchName = s.Name,
                        ExecutedAt = s.LastExecutedAt!.Value,
                        ResultCount = s.ResultsCount,
                        NewResults = s.NewResultsCount
                    }).ToList();

                var response = new SavedSearchStatsResponse
                {
                    TotalSearches = searches.Count,
                    TotalResults = searches.Sum(s => s.ResultsCount),
                    NewResults = searches.Sum(s => s.NewResultsCount),
                    MostSuccessfulSearch = mostSuccessful != null ? new MostSuccessfulSearchDto
                    {
                        Id = mostSuccessful.Id,
                        Name = mostSuccessful.Name,
                        ResultCount = mostSuccessful.ResultsCount
                    } : null,
                    RecentActivity = recentActivity
                };

                _logger.LogInformation("Stats calculated: {TotalSearches} searches, {NewResults} new results", 
                    response.TotalSearches, response.NewResults);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting saved search stats for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Executar uma pesquisa salva (atualiza contador de resultados)
        /// </summary>
        [HttpPost("{id}/execute")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult> ExecuteSavedSearch(string id)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            _logger.LogInformation("Executing saved search {SearchId} for user {UserId}", id, userId);

            try
            {
                // Buscar a pesquisa salva
                var savedSearch = await _context.SavedSearches
                    .FirstOrDefaultAsync(ss => ss.Id == id && ss.UserId == userId);

                if (savedSearch == null)
                    return NotFound(new { message = "Pesquisa salva não encontrada" });

                // Atualizar contador de resultados
                var newCount = await CountPropertiesMatchingCriteria(savedSearch);
                var previousCount = savedSearch.ResultsCount;
                
                savedSearch.ResultsCount = newCount;
                savedSearch.NewResultsCount = Math.Max(0, newCount - previousCount);
                savedSearch.LastExecutedAt = DateTime.UtcNow;
                savedSearch.UpdatedAt = DateTime.UtcNow;
                
                await _context.SaveChangesAsync();

                _logger.LogInformation("Updated search {SearchId}: {NewCount} properties (was {PreviousCount})", 
                    id, newCount, previousCount);

                return Ok(new { 
                    success = true, 
                    totalCount = newCount,
                    newCount = Math.Max(0, newCount - previousCount),
                    message = "Pesquisa executada e atualizada com sucesso" 
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing saved search {SearchId}", id);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }
    }
}