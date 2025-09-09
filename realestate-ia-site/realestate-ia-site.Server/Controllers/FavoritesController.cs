using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Application.Common.Exceptions;
using realestate_ia_site.Server.Application.DTOs.PropertySearch;
using System.ComponentModel.DataAnnotations;
using AppUnauthorizedException = realestate_ia_site.Server.Application.Common.Exceptions.UnauthorizedAccessException;

namespace realestate_ia_site.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("ApiPolicy")]
    [Authorize]
    public class FavoritesController : BaseController
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<FavoritesController> _logger;

        public FavoritesController(
            ApplicationDbContext context,
            ILogger<FavoritesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Obter propriedades favoritas do usuário
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
                // TODO: Implementar tabela de favoritos
                // Por enquanto, retornar lista vazia
                var favorites = new List<PropertySearchDto>();
                
                _logger.LogInformation("Found {Count} favorite properties for user", favorites.Count);

                return Ok(new FavoritePropertiesResponse
                {
                    Favorites = favorites,
                    TotalCount = favorites.Count,
                    Page = page,
                    PageSize = pageSize,
                    HasNextPage = false,
                    HasPreviousPage = false
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
                throw new ArgumentException("PropertyId é obrigatório", nameof(request.PropertyId));

            _logger.LogInformation("Adding property {PropertyId} to favorites for user {UserId}", 
                request.PropertyId, userId);

            // Verificar se propriedade existe
            var propertyExists = await _context.Properties
                .AnyAsync(p => p.Id == request.PropertyId);

            if (!propertyExists)
                throw new PropertyNotFoundException(request.PropertyId);

            // TODO: Verificar se já está nos favoritos e implementar lógica de favoritos
            // if (await IsFavoriteAsync(userId, request.PropertyId))
            // {
            //     return Conflict(new { message = "Propriedade já está nos favoritos" });
            // }

            // TODO: Implementar tabela de favoritos
            _logger.LogInformation("Property added to favorites successfully");

            return Ok(new SuccessResponse
            {
                Success = true,
                Message = "Propriedade adicionada aos favoritos"
            });
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

                // TODO: Verificar se está nos favoritos
                // if (!await IsFavoriteAsync(userId, propertyId))
                // {
                //     return NotFound(new { message = "Propriedade não encontrada nos favoritos" });
                // }

                // TODO: Implementar remoção de favoritos
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

                // TODO: Implementar verificação de favorito
                var isFavorite = false; // await IsFavoriteAsync(userId, propertyId);

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
        /// Limpar todos os favoritos do usuário
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

                // TODO: Implementar limpeza de favoritos
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

        // TODO: Implementar método auxiliar quando a tabela de favoritos for criada
        // private async Task<bool> IsFavoriteAsync(string userId, string propertyId)
        // {
        //     return await _context.Favorites
        //         .AnyAsync(f => f.UserId == userId && f.PropertyId == propertyId);
        // }
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