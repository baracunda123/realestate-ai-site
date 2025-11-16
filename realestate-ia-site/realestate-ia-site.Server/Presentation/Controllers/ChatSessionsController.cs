using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.Features.Chat.DTOs;
using realestate_ia_site.Server.Application.Features.Chat.Interfaces;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;

namespace realestate_ia_site.Server.Presentation.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ChatSessionsController : BaseController
    {
        private readonly IChatSessionService _chatSessionService;
        private readonly IChatSessionPropertyService _chatSessionPropertyService;
        private readonly IConversationContextService _conversationContextService;
        private readonly ILogger<ChatSessionsController> _logger;

        public ChatSessionsController(
            IChatSessionService chatSessionService,
            IChatSessionPropertyService chatSessionPropertyService,
            IConversationContextService conversationContextService,
            ILogger<ChatSessionsController> logger)
        {
            _chatSessionService = chatSessionService;
            _chatSessionPropertyService = chatSessionPropertyService;
            _conversationContextService = conversationContextService;
            _logger = logger;
        }

        /// <summary>
        /// Obter todas as sessões de chat do utilizador
        /// </summary>
        [HttpGet]
        [ProducesResponseType(typeof(List<ChatSessionDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<List<ChatSessionDto>>> GetSessions(CancellationToken ct = default)
        {
            try
            {
                var userId = GetCurrentUserId();
                var sessions = await _chatSessionService.GetUserSessionsAsync(userId, ct);
                return Ok(sessions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter sessões de chat");
                return StatusCode(500, new { error = "Erro ao obter sessões de chat" });
            }
        }

        /// <summary>
        /// Obter sessão específica com todas as mensagens
        /// </summary>
        [HttpGet("{sessionId}")]
        [ProducesResponseType(typeof(ChatSessionWithMessagesDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ChatSessionWithMessagesDto>> GetSession(string sessionId, CancellationToken ct = default)
        {
            try
            {
                var userId = GetCurrentUserId();
                var session = await _chatSessionService.GetSessionByIdAsync(sessionId, userId, ct);

                if (session == null)
                {
                    return NotFound(new { error = "Sessão não encontrada" });
                }

                // Restaurar contexto conversacional da BD para o cache
                // Isto garante que filtros e histórico sejam recuperados ao voltar para a conversa
                _conversationContextService.RestoreContextFromDatabase(sessionId);

                return Ok(session);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter sessão {SessionId}", sessionId);
                return StatusCode(500, new { error = "Erro ao obter sessão" });
            }
        }

        /// <summary>
        /// Criar nova sessão de chat
        /// </summary>
        [HttpPost]
        [ProducesResponseType(typeof(ChatSessionDto), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ChatSessionDto>> CreateSession(
            [FromBody] CreateChatSessionDto? createDto = null,
            CancellationToken ct = default)
        {
            try
            {
                var userId = GetCurrentUserId();
                var session = await _chatSessionService.CreateSessionAsync(
                    userId,
                    createDto?.Title,
                    ct);

                return CreatedAtAction(
                    nameof(GetSession),
                    new { sessionId = session.Id },
                    session);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao criar sessão de chat");
                return StatusCode(500, new { error = "Erro ao criar sessão" });
            }
        }

        /// <summary>
        /// Atualizar sessão (título, estado)
        /// </summary>
        [HttpPatch("{sessionId}")]
        [ProducesResponseType(typeof(ChatSessionDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ChatSessionDto>> UpdateSession(
            string sessionId,
            [FromBody] UpdateChatSessionDto updateDto,
            CancellationToken ct = default)
        {
            try
            {
                var userId = GetCurrentUserId();
                var session = await _chatSessionService.UpdateSessionAsync(sessionId, userId, updateDto, ct);

                if (session == null)
                {
                    return NotFound(new { error = "Sessão não encontrada" });
                }

                return Ok(session);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao atualizar sessão {SessionId}", sessionId);
                return StatusCode(500, new { error = "Erro ao atualizar sessão" });
            }
        }

        /// <summary>
        /// Eliminar sessão
        /// </summary>
        [HttpDelete("{sessionId}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> DeleteSession(string sessionId, CancellationToken ct = default)
        {
            try
            {
                var userId = GetCurrentUserId();
                var success = await _chatSessionService.DeleteSessionAsync(sessionId, userId, ct);

                if (!success)
                {
                    return NotFound(new { error = "Sessão não encontrada" });
                }

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao eliminar sessão {SessionId}", sessionId);
                return StatusCode(500, new { error = "Erro ao eliminar sessão" });
            }
        }

        /// <summary>
        /// Obter ou criar sessão ativa (para compatibilidade)
        /// </summary>
        [HttpGet("active")]
        [ProducesResponseType(typeof(ChatSessionDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<ChatSessionDto>> GetOrCreateActiveSession(CancellationToken ct = default)
        {
            try
            {
                var userId = GetCurrentUserId();
                var session = await _chatSessionService.GetOrCreateActiveSessionAsync(userId, ct);
                return Ok(session);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter/criar sessão ativa");
                return StatusCode(500, new { error = "Erro ao obter sessão ativa" });
            }
        }

        /// <summary>
        /// Obter propriedades associadas a uma sessão
        /// </summary>
        [HttpGet("{sessionId}/properties")]
        [ProducesResponseType(typeof(List<PropertySearchDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<ActionResult<List<PropertySearchDto>>> GetSessionProperties(
            string sessionId,
            CancellationToken ct = default)
        {
            try
            {
                var properties = await _chatSessionPropertyService.GetSessionPropertiesAsync(sessionId, ct);
                return Ok(properties);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter propriedades da sessão {SessionId}", sessionId);
                return StatusCode(500, new { error = "Erro ao obter propriedades da sessão" });
            }
        }
    }
}
