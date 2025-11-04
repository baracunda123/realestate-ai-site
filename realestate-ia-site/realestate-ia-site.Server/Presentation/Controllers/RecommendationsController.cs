using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Application.Recommendations;
using realestate_ia_site.Server.Application.Recommendations.DTOs;
using realestate_ia_site.Server.Presentation.Controllers;

namespace realestate_ia_site.Server.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [EnableRateLimiting("ApiPolicy")]
    [Authorize]
    public class RecommendationsController : BaseController
    {
        private readonly PropertyRecommendationService _recommendationService;
        private readonly IApplicationDbContext _context;
        private readonly ILogger<RecommendationsController> _logger;

        public RecommendationsController(
            PropertyRecommendationService recommendationService,
            IApplicationDbContext context,
            ILogger<RecommendationsController> logger)
        {
            _recommendationService = recommendationService;
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Obter recomendações para o dashboard do utilizador
        /// </summary>
        [HttpGet("dashboard")]
        [ProducesResponseType(typeof(DashboardRecommendationsDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<DashboardRecommendationsDto>> GetDashboardRecommendations(
            [FromQuery] int limit = 10)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Getting dashboard recommendations for user {UserId}", userId);

            try
            {
                var recommendations = await _recommendationService.GetUserRecommendationsAsync(
                    userId, limit, HttpContext.RequestAborted);

                _logger.LogInformation("Found {Count} recommendations for user {UserId}", 
                    recommendations.Properties.Count, userId);

                return Ok(recommendations);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting dashboard recommendations for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Marcar recomendação como visualizada
        /// </summary>
        [HttpPost("{propertyId}/mark-viewed")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> MarkRecommendationAsViewed(string propertyId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Marking recommendation as viewed: user {UserId}, property {PropertyId}", 
                userId, propertyId);

            try
            {
                var recommendation = await _context.PropertyRecommendations
                    .FirstOrDefaultAsync(r => r.UserId == userId && r.PropertyId == propertyId && r.IsActive);

                if (recommendation == null)
                    return NotFound(new { message = "Recomendação não encontrada" });

                recommendation.ViewedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Recommendation marked as viewed successfully");

                return Ok(new { success = true, message = "Recomendação marcada como visualizada" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking recommendation as viewed");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Descartar recomendação (marcar como inativa)
        /// </summary>
        [HttpDelete("{propertyId}")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> DismissRecommendation(string propertyId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Dismissing recommendation: user {UserId}, property {PropertyId}", 
                userId, propertyId);

            try
            {
                var recommendation = await _context.PropertyRecommendations
                    .FirstOrDefaultAsync(r => r.UserId == userId && r.PropertyId == propertyId && r.IsActive);

                if (recommendation == null)
                    return NotFound(new { message = "Recomendação não encontrada" });

                recommendation.IsActive = false;
                recommendation.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                _logger.LogInformation("Recommendation dismissed successfully");

                return Ok(new { success = true, message = "Recomendação descartada" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error dismissing recommendation");
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Obter estatísticas das recomendações do utilizador
        /// </summary>
        [HttpGet("stats")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> GetRecommendationStats()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Getting recommendation stats for user {UserId}", userId);

            try
            {
                var allRecommendations = await _context.PropertyRecommendations
                    .Where(r => r.UserId == userId)
                    .ToListAsync();

                var activeRecommendations = allRecommendations.Where(r => r.IsActive).ToList();
                var viewedCount = allRecommendations.Count(r => r.ViewedAt.HasValue);

                var result = new
                {
                    total = allRecommendations.Count,
                    active = activeRecommendations.Count,
                    viewed = viewedCount,
                    unviewed = activeRecommendations.Count - viewedCount,
                    averageScore = activeRecommendations.Any() ? (int)activeRecommendations.Average(r => r.Score) : 0,
                    byReason = activeRecommendations.GroupBy(r => r.Reason)
                        .ToDictionary(g => g.Key, g => g.Count())
                };

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting recommendation stats for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Refresh completo das recomendações baseado no perfil atual do utilizador
        /// </summary>
        [HttpPost("refresh")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> RefreshRecommendations()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Refreshing recommendations for user {UserId}", userId);

            try
            {
                await _recommendationService.RefreshUserRecommendationsAsync(userId, HttpContext.RequestAborted);

                return Ok(new 
                { 
                    success = true, 
                    message = "Recomendações atualizadas com base no seu perfil atual"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing recommendations for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }

        /// <summary>
        /// Obter recomendações similares a uma propriedade específica
        /// </summary>
        [HttpPost("similar-to/{propertyId}")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult> GenerateSimilarRecommendations(string propertyId)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            _logger.LogInformation("Generating similar recommendations for user {UserId} based on property {PropertyId}", 
                userId, propertyId);

            try
            {
                var property = await _context.Properties.FirstOrDefaultAsync(p => p.Id == propertyId);
                if (property == null)
                    return NotFound(new { message = "Propriedade não encontrada" });

                await _recommendationService.ProcessSimilarPropertiesAsync(userId, property, HttpContext.RequestAborted);

                return Ok(new 
                { 
                    success = true, 
                    message = "Recomendações similares geradas com sucesso"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating similar recommendations for user {UserId}", userId);
                return StatusCode(500, new { message = "Erro interno do servidor" });
            }
        }
    }
}

