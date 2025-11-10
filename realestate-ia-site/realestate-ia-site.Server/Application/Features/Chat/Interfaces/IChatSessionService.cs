using realestate_ia_site.Server.Application.Features.Chat.DTOs;
using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Application.Features.Chat.Interfaces
{
    public interface IChatSessionService
    {
        /// <summary>
        /// Obter todas as sessões de chat do utilizador
        /// </summary>
        Task<List<ChatSessionDto>> GetUserSessionsAsync(string userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Obter uma sessão específica com todas as mensagens
        /// </summary>
        Task<ChatSessionWithMessagesDto?> GetSessionByIdAsync(string sessionId, string userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Criar nova sessão de chat
        /// </summary>
        Task<ChatSessionDto> CreateSessionAsync(string userId, string? title = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// Atualizar sessão (título, estado)
        /// </summary>
        Task<ChatSessionDto?> UpdateSessionAsync(string sessionId, string userId, UpdateChatSessionDto updateDto, CancellationToken cancellationToken = default);

        /// <summary>
        /// Eliminar sessão
        /// </summary>
        Task<bool> DeleteSessionAsync(string sessionId, string userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Adicionar mensagem a uma sessão
        /// </summary>
        Task<AddMessageResultDto> AddMessageAsync(string sessionId, string role, string content, CancellationToken cancellationToken = default);

        /// <summary>
        /// Obter ou criar sessão ativa (para compatibilidade com fluxo atual)
        /// </summary>
        Task<ChatSessionDto> GetOrCreateActiveSessionAsync(string userId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gerar título automático baseado na primeira mensagem
        /// </summary>
        Task<string> GenerateSessionTitleAsync(string firstMessage, CancellationToken cancellationToken = default);
    }
}
