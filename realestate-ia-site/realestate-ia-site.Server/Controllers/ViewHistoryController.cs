using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Application.DTOs.ViewHistory;
using realestate_ia_site.Server.Application.DTOs.PropertySearch;
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
                    // 2. ANTES de adicionar novo, verificar limite e remover antigos se necessário
                    var currentHistoryItems = await _context.PropertyViewHistories
                        .Where(h => h.UserId == userId)
                        .OrderBy(h => h.ViewedAt) // Mais antigos primeiro
                        .ToListAsync();

                    // Se já temos MAX_HISTORY_ITEMS (10), remover os mais antigos
                    if (currentHistoryItems.Count >= MAX_HISTORY_ITEMS)
                    {
                        var itemsToRemove = currentHistoryItems.Count - MAX_HISTORY_ITEMS + 1; // +1 para dar espaço ao novo
                        var toRemove = currentHistoryItems.Take(itemsToRemove).ToList();
                        
                        _context.PropertyViewHistories.RemoveRange(toRemove);
                        
                        _logger.LogInformation("Removed {Count} old view history items for user {UserId} to make space for new item", 
                            toRemove.Count, userId);
                    }

                    // 3. Adicionar novo item
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
        /// Ocultar item específico do histórico de visualizações (soft delete)
        /// </summary>
        [HttpPatch("{historyId}/remove")]
        [ProducesResponseType(typeof(RemoveFromHistoryResponse), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<RemoveFromHistoryResponse>> HideFromHistory([FromRoute] string historyId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Usuário não autenticado" });

            if (string.IsNullOrEmpty(historyId))
                return BadRequest(new { message = "HistoryId é obrigatório" });

            _logger.LogInformation("Hiding view history item {HistoryId} for user {UserId}", 
                historyId, userId);

            try
            {
                // Buscar o item do histórico
                var historyItem = await _context.PropertyViewHistories
                    .FirstOrDefaultAsync(h => h.Id == historyId && h.UserId == userId);

                if (historyItem == null)
                {
                    _logger.LogWarning("View history item {HistoryId} not found for user {UserId}", 
                        historyId, userId);
                    return NotFound(new { message = "Item do histórico não encontrado" });
                }

                // Marcar como oculto ao invés de eliminar
                historyItem.IsHidden = true;
                historyItem.HiddenAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Successfully hid view history item {HistoryId} for user {UserId}", 
                    historyId, userId);

                return Ok(new RemoveFromHistoryResponse
                {
                    Success = true,
                    Message = "Item removido do histórico com sucesso"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error hiding view history item {HistoryId} for user {UserId}", 
                    historyId, userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Obter histórico de visualizações do usuário (excluindo itens ocultos)
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
                    .Where(h => h.UserId == userId && !h.IsHidden) // Excluir itens ocultos
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
                        ViewedAt = h.ViewedAt,
                        Property = PropertySearchDto.FromDomain(h.Property)
                    })
                    .ToListAsync();

                // Calcular totalViews apenas dos itens não ocultos
                var totalViews = await query.SumAsync(h => h.ViewCount);

                _logger.LogInformation("Found {Count} view history items for user {UserId} (excluding hidden)", history.Count, userId);

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
    }
}