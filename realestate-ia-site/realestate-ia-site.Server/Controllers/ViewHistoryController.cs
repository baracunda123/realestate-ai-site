using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Application.DTOs.ViewHistory;
using realestate_ia_site.Server.Application.Common.Exceptions;

namespace realestate_ia_site.Server.Controllers
{
    [ApiController]
    [Route("api/view-history")]
    [EnableRateLimiting("ApiPolicy")]
    [Authorize]
    public class ViewHistoryController : BaseController
    {
        private const int MAX_HISTORY_ITEMS = 10;
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ViewHistoryController> _logger;

        public ViewHistoryController(
            ApplicationDbContext context,
            ILogger<ViewHistoryController> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Registrar visualização de propriedade
        /// </summary>
        [HttpPost("track")]
        [ProducesResponseType(typeof(TrackViewResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<TrackViewResponse>> TrackView([FromBody] TrackViewRequest request)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            if (string.IsNullOrEmpty(request.PropertyId))
                return BadRequest(new { message = "PropertyId é obrigatório" });

            _logger.LogInformation("Tracking view for property {PropertyId} by user {UserId}", 
                request.PropertyId, userId);

            try
            {
                // 1. Verificar se já existe
                var existing = await _context.PropertyViewHistories
                    .FirstOrDefaultAsync(h => h.UserId == userId && h.PropertyId == request.PropertyId);

                if (existing != null)
                {
                    // Atualizar: move para o topo e incrementa contador
                    existing.ViewedAt = DateTime.UtcNow;
                    existing.ViewCount++;
                    
                    _logger.LogInformation("Updated existing view history for property {PropertyId}, new count: {ViewCount}", 
                        request.PropertyId, existing.ViewCount);
                }
                else
                {
                    // 2. Verificar se precisa remover itens antigos
                    var userHistoryCount = await _context.PropertyViewHistories
                        .CountAsync(h => h.UserId == userId);

                    if (userHistoryCount >= MAX_HISTORY_ITEMS)
                    {
                        // Remover os mais antigos
                        var toRemove = await _context.PropertyViewHistories
                            .Where(h => h.UserId == userId)
                            .OrderBy(h => h.ViewedAt)
                            .Take(userHistoryCount - MAX_HISTORY_ITEMS + 1)
                            .ToListAsync();

                        _context.PropertyViewHistories.RemoveRange(toRemove);
                        
                        _logger.LogInformation("Removed {Count} old view history items for user {UserId}", 
                            toRemove.Count, userId);
                    }

                    // 3. Adicionar novo
                    var newHistory = new PropertyViewHistory
                    {
                        UserId = userId,
                        PropertyId = request.PropertyId,
                        ViewedAt = DateTime.UtcNow,
                        ViewCount = 1
                    };

                    _context.PropertyViewHistories.Add(newHistory);
                    existing = newHistory;
                    
                    _logger.LogInformation("Created new view history for property {PropertyId}", request.PropertyId);
                }

                await _context.SaveChangesAsync();

                return Ok(new TrackViewResponse
                {
                    Success = true,
                    Message = "Visualização registrada com sucesso",
                    ViewCount = existing.ViewCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error tracking view for property {PropertyId} by user {UserId}", 
                    request.PropertyId, userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Obter histórico de visualizações do usuário
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(ViewHistoryResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<ViewHistoryResponse>> GetViewHistory([FromQuery] int? limit)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            _logger.LogInformation("Getting view history for user {UserId}", userId);

            try
            {
                var query = _context.PropertyViewHistories
                    .Include(h => h.Property)
                    .Where(h => h.UserId == userId)
                    .OrderByDescending(h => h.ViewedAt);

                if (limit.HasValue && limit.Value > 0)
                {
                    query = (IOrderedQueryable<PropertyViewHistory>)query.Take(limit.Value);
                }
                else
                {
                    query = (IOrderedQueryable<PropertyViewHistory>)query.Take(MAX_HISTORY_ITEMS);
                }

                var history = await query
                    .Select(h => new ViewHistoryItemDto
                    {
                        Id = h.Id,
                        PropertyId = h.PropertyId,
                        PropertyTitle = h.Property.Title ?? "Propriedade sem título",
                        ViewedAt = h.ViewedAt,
                        ViewCount = h.ViewCount
                    })
                    .ToListAsync();

                var totalViews = history.Sum(h => h.ViewCount);

                _logger.LogInformation("Found {Count} view history items for user {UserId}", history.Count, userId);

                return Ok(new ViewHistoryResponse
                {
                    ViewHistory = history,
                    TotalCount = history.Count,
                    TotalViews = totalViews
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting view history for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Obter detalhes de uma visualização específica
        /// </summary>
        [HttpGet("{historyId}")]
        [ProducesResponseType(typeof(ViewHistoryItemDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ViewHistoryItemDto>> GetViewHistoryItem(string historyId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            try
            {
                var item = await _context.PropertyViewHistories
                    .Include(h => h.Property)
                    .Where(h => h.Id == historyId && h.UserId == userId)
                    .Select(h => new ViewHistoryItemDto
                    {
                        Id = h.Id,
                        PropertyId = h.PropertyId,
                        PropertyTitle = h.Property.Title ?? "Propriedade sem título",
                        ViewedAt = h.ViewedAt,
                        ViewCount = h.ViewCount
                    })
                    .FirstOrDefaultAsync();

                if (item == null)
                    return NotFound(new { message = "Item do histórico não encontrado" });

                return Ok(item);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting view history item {HistoryId} for user {UserId}", 
                    historyId, userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Remover item do histórico de visualizações
        /// </summary>
        [HttpDelete("{historyId}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> RemoveFromViewHistory(string historyId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            try
            {
                var item = await _context.PropertyViewHistories
                    .FirstOrDefaultAsync(h => h.Id == historyId && h.UserId == userId);

                if (item == null)
                    return NotFound(new { message = "Item do histórico não encontrado" });

                _context.PropertyViewHistories.Remove(item);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Removed view history item {HistoryId} for user {UserId}", 
                    historyId, userId);

                return Ok(new { success = true, message = "Item removido do histórico com sucesso" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing view history item {HistoryId} for user {UserId}", 
                    historyId, userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Limpar todo o histórico de visualizações
        /// </summary>
        [HttpDelete("clear")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> ClearViewHistory()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            try
            {
                var items = await _context.PropertyViewHistories
                    .Where(h => h.UserId == userId)
                    .ToListAsync();

                _context.PropertyViewHistories.RemoveRange(items);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Cleared {Count} view history items for user {UserId}", 
                    items.Count, userId);

                return Ok(new { 
                    success = true, 
                    message = "Histórico de visualizações limpo com sucesso",
                    removedCount = items.Count
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error clearing view history for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Obter estatísticas do histórico de visualizações
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(ViewHistoryStatsResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ViewHistoryStatsResponse>> GetViewHistoryStats()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            try
            {
                var history = await _context.PropertyViewHistories
                    .Include(h => h.Property)
                    .Where(h => h.UserId == userId)
                    .ToListAsync();

                if (!history.Any())
                {
                    return Ok(new ViewHistoryStatsResponse());
                }

                var totalViews = history.Sum(h => h.ViewCount);
                var uniqueProperties = history.Count;

                var mostViewed = history
                    .OrderByDescending(h => h.ViewCount)
                    .First();

                var recentActivity = history
                    .OrderByDescending(h => h.ViewedAt)
                    .Take(5)
                    .Select(h => new RecentActivityDto
                    {
                        PropertyId = h.PropertyId,
                        PropertyTitle = h.Property.Title ?? "Propriedade sem título",
                        ViewedAt = h.ViewedAt,
                        ViewCount = h.ViewCount
                    })
                    .ToList();

                return Ok(new ViewHistoryStatsResponse
                {
                    TotalViews = totalViews,
                    UniqueProperties = uniqueProperties,
                    MostViewedProperty = new MostViewedPropertyDto
                    {
                        PropertyId = mostViewed.PropertyId,
                        PropertyTitle = mostViewed.Property.Title ?? "Propriedade sem título",
                        ViewCount = mostViewed.ViewCount
                    },
                    RecentActivity = recentActivity
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting view history stats for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Marcar uma visualização como "vista novamente" (incrementar contador)
        /// </summary>
        [HttpPost("{propertyId}/view-again")]
        [ProducesResponseType(typeof(TrackViewResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<TrackViewResponse>> MarkAsViewedAgain(string propertyId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            try
            {
                var existing = await _context.PropertyViewHistories
                    .FirstOrDefaultAsync(h => h.UserId == userId && h.PropertyId == propertyId);

                if (existing == null)
                    return NotFound(new { message = "Propriedade não encontrada no histórico" });

                existing.ViewedAt = DateTime.UtcNow;
                existing.ViewCount++;

                await _context.SaveChangesAsync();

                return Ok(new TrackViewResponse
                {
                    Success = true,
                    Message = "Propriedade marcada como vista novamente",
                    ViewCount = existing.ViewCount
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking property {PropertyId} as viewed again for user {UserId}", 
                    propertyId, userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }
    }
}