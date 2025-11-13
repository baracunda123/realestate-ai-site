using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Infrastructure.Persistence;
using realestate_ia_site.Server.Application.Common.Exceptions;
using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.Common.Events;
using realestate_ia_site.Server.Domain.Events;
using System.ComponentModel.DataAnnotations;
using AppUnauthorizedException = realestate_ia_site.Server.Application.Common.Exceptions.UnauthorizedAccessException;

namespace realestate_ia_site.Server.Presentation.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("ApiPolicy")]
    [Authorize]
    public class FavoritesController : BaseController
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<FavoritesController> _logger;
        private readonly IDomainEventDispatcher _eventDispatcher;

        public FavoritesController(
            ApplicationDbContext context,
            ILogger<FavoritesController> logger,
            IDomainEventDispatcher eventDispatcher)
        {
            _context = context;
            _logger = logger;
            _eventDispatcher = eventDispatcher;
        }

        /// <summary>
        /// Obter propriedades favoritas do utilizador
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(FavoritePropertiesResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<FavoritePropertiesResponse>> GetFavoriteProperties(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                throw new AppUnauthorizedException("get favorites");

            _logger.LogInformation("Getting favorite properties for user {UserId}", userId);

            try
            {
                var query = _context.Favorites
                    .Include(f => f.Property)
                    .Where(f => f.UserId == userId)
                    .OrderByDescending(f => f.CreatedAt);

                var totalCount = await query.CountAsync();
                
                var favoritesList = await query
                    .Skip((page - 1) * pageSize)
                    .Take(pageSize)
                    .ToListAsync();
                
                // Get latest price changes for all favorite properties (last 30 days)
                var propertyIds = favoritesList.Select(f => f.PropertyId).ToList();
                var cutoffDate = DateTime.UtcNow.AddDays(-30);
                
                var latestPriceChanges = await _context.PropertyPriceHistories
                    .Where(h => propertyIds.Contains(h.PropertyId) && h.ChangedAt >= cutoffDate)
                    .GroupBy(h => h.PropertyId)
                    .Select(g => g.OrderByDescending(h => h.ChangedAt).FirstOrDefault())
                    .ToListAsync();
                
                var priceChangeDict = latestPriceChanges
                    .Where(h => h != null)
                    .ToDictionary(h => h!.PropertyId, h => h);

                var favorites = favoritesList.Select(f => 
                {
                    priceChangeDict.TryGetValue(f.PropertyId, out var priceChange);
                    return PropertySearchDto.FromDomain(f.Property, priceChange);
                }).ToList();
                
                _logger.LogInformation("Found {Count} favorite properties for user", favorites.Count);

                return Ok(new FavoritePropertiesResponse
                {
                    Favorites = favorites,
                    TotalCount = totalCount,
                    Page = page,
                    PageSize = pageSize,
                    HasNextPage = page * pageSize < totalCount,
                    HasPreviousPage = page > 1
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting favorite properties for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Adicionar propriedade aos favoritos
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<SuccessResponse>> AddToFavorites([FromBody] AddFavoriteRequest request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                throw new AppUnauthorizedException("add to favorites");

            if (string.IsNullOrEmpty(request.PropertyId))
                throw new ArgumentException("PropertyId obrigatório", nameof(request.PropertyId));

            _logger.LogInformation("Adding property {PropertyId} to favorites for user {UserId}", 
                request.PropertyId, userId);

            try
            {
                // Verificar se propriedade existe
                var propertyExists = await _context.Properties
                    .AnyAsync(p => p.Id == request.PropertyId);

                if (!propertyExists)
                    throw new PropertyNotFoundException(request.PropertyId);

                // Verificar se já está nos favoritos
                if (await IsFavoriteAsync(userId, request.PropertyId))
                {
                    return Conflict(new { message = "Propriedade já está nos favoritos" });
                }

                // Adicionar aos favoritos
                var favorite = new Favorite
                {
                    UserId = userId,
                    PropertyId = request.PropertyId
                };

                _context.Favorites.Add(favorite);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Property added to favorites successfully");

                return Ok(new SuccessResponse
                {
                    Success = true,
                    Message = "Propriedade adicionada aos favoritos"
                });
            }
            catch (PropertyNotFoundException)
            {
                return NotFound(new { message = "Propriedade não encontrada" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding property to favorites");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Remover propriedade dos favoritos
        /// </summary>
        [HttpDelete("{propertyId}")]
        [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<SuccessResponse>> RemoveFromFavorites(string propertyId)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized();

                _logger.LogInformation("Removing property {PropertyId} from favorites for user {UserId}", 
                    propertyId, userId);

                // Verificar se está nos favoritos e obter a propriedade
                var favorite = await _context.Favorites
                    .Include(f => f.Property)
                    .FirstOrDefaultAsync(f => f.UserId == userId && f.PropertyId == propertyId);

                if (favorite == null)
                {
                    return NotFound(new { message = "Propriedade não encontrada nos favoritos" });
                }

                // Guardar referência à propriedade antes de remover
                var property = favorite.Property;

                // Remover dos favoritos
                _context.Favorites.Remove(favorite);
                await _context.SaveChangesAsync();

                // NOVO: Disparar evento de remoção de favorito
                var favoriteRemovedEvent = new FavoriteRemovedEvent
                {
                    UserId = userId,
                    PropertyId = propertyId,
                    Property = property
                };

                try
                {
                    await _eventDispatcher.PublishAsync(favoriteRemovedEvent);
                }
                catch (Exception ex)
                {
                    // Log do erro mas não falha a remoção do favorito
                    _logger.LogWarning(ex, "Failed to publish favorite removed event for user {UserId}", userId);
                }

                _logger.LogInformation("Property removed from favorites successfully");

                return Ok(new SuccessResponse
                {
                    Success = true,
                    Message = "Propriedade removida dos favoritos"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing property from favorites");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Verificar se uma propriedade está nos favoritos
        /// </summary>
        [HttpGet("{propertyId}/status")]
        [ProducesResponseType(typeof(FavoriteStatusResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<FavoriteStatusResponse>> GetFavoriteStatus(string propertyId)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized();

                _logger.LogInformation("Checking favorite status for property {PropertyId} and user {UserId}", 
                    propertyId, userId);

                var isFavorite = await IsFavoriteAsync(userId, propertyId);

                return Ok(new FavoriteStatusResponse
                {
                    PropertyId = propertyId,
                    IsFavorite = isFavorite
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking favorite status");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Limpar todos os favoritos do utilizador
        /// </summary>
        [HttpDelete]
        [ProducesResponseType(typeof(SuccessResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<SuccessResponse>> ClearAllFavorites()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized();

                _logger.LogInformation("Clearing all favorites for user {UserId}", userId);

                var favorites = await _context.Favorites
                    .Where(f => f.UserId == userId)
                    .ToListAsync();

                _context.Favorites.RemoveRange(favorites);
                await _context.SaveChangesAsync();

                _logger.LogInformation("All favorites cleared successfully");

                return Ok(new SuccessResponse
                {
                    Success = true,
                    Message = "Todos os favoritos foram removidos"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error clearing all favorites");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        // Método auxiliar para verificar se uma propriedade é favorita
        private async Task<bool> IsFavoriteAsync(string userId, string propertyId)
        {
            return await _context.Favorites
                .AnyAsync(f => f.UserId == userId && f.PropertyId == propertyId);
        }
    }

    // DTOs para responses
    public class FavoritePropertiesResponse
    {
        public List<PropertySearchDto> Favorites { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public bool HasNextPage { get; set; }
        public bool HasPreviousPage { get; set; }
    }

    public class AddFavoriteRequest
    {
        [Required]
        public string PropertyId { get; set; } = string.Empty;
    }

    public class FavoriteStatusResponse
    {
        public string PropertyId { get; set; } = string.Empty;
        public bool IsFavorite { get; set; }
    }

    public class SuccessResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }
}


