using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Application.Features.Chat.DTOs;
using realestate_ia_site.Server.Application.Features.Chat.Interfaces;
using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Infrastructure.Chat
{
    public class ChatSessionService : IChatSessionService
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<ChatSessionService> _logger;

        public ChatSessionService(
            IApplicationDbContext context,
            ILogger<ChatSessionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<ChatSessionDto>> GetUserSessionsAsync(string userId, CancellationToken cancellationToken = default)
        {
            var sessions = await _context.ChatSessions
                .Where(s => s.UserId == userId && s.IsActive)
                .OrderByDescending(s => s.UpdatedAt)
                .Select(s => new ChatSessionDto
                {
                    Id = s.Id,
                    UserId = s.UserId,
                    Title = s.Title,
                    CreatedAt = s.CreatedAt,
                    UpdatedAt = s.UpdatedAt,
                    IsActive = s.IsActive,
                    MessageCount = s.Messages.Count,
                    LastMessage = s.Messages
                        .OrderByDescending(m => m.Timestamp)
                        .Select(m => new ChatMessageDto
                        {
                            Id = m.Id,
                            SessionId = m.SessionId,
                            Role = m.Role,
                            Content = m.Content.Length > 100 ? m.Content.Substring(0, 100) + "..." : m.Content,
                            Timestamp = m.Timestamp
                        })
                        .FirstOrDefault()
                })
                .ToListAsync(cancellationToken);

            return sessions;
        }

        public async Task<ChatSessionWithMessagesDto?> GetSessionByIdAsync(string sessionId, string userId, CancellationToken cancellationToken = default)
        {
            var session = await _context.ChatSessions
                .Include(s => s.Messages)
                .Where(s => s.Id == sessionId && s.UserId == userId)
                .Select(s => new ChatSessionWithMessagesDto
                {
                    Id = s.Id,
                    UserId = s.UserId,
                    Title = s.Title,
                    CreatedAt = s.CreatedAt,
                    UpdatedAt = s.UpdatedAt,
                    IsActive = s.IsActive,
                    Messages = s.Messages
                        .OrderBy(m => m.Timestamp)
                        .Select(m => new ChatMessageDto
                        {
                            Id = m.Id,
                            SessionId = m.SessionId,
                            Role = m.Role,
                            Content = m.Content,
                            Timestamp = m.Timestamp
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync(cancellationToken);

            return session;
        }

        public async Task<ChatSessionDto> CreateSessionAsync(string userId, string? title = null, CancellationToken cancellationToken = default)
        {
            var session = new ChatSession
            {
                Id = Guid.NewGuid().ToString(),
                UserId = userId,
                Title = title ?? "Nova Conversa",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.ChatSessions.Add(session);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Nova sessão de chat criada: {SessionId} para utilizador {UserId}", session.Id, userId);

            return new ChatSessionDto
            {
                Id = session.Id,
                UserId = session.UserId,
                Title = session.Title,
                CreatedAt = session.CreatedAt,
                UpdatedAt = session.UpdatedAt,
                IsActive = session.IsActive,
                MessageCount = 0
            };
        }

        public async Task<ChatSessionDto?> UpdateSessionAsync(string sessionId, string userId, UpdateChatSessionDto updateDto, CancellationToken cancellationToken = default)
        {
            var session = await _context.ChatSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, cancellationToken);

            if (session == null)
            {
                _logger.LogWarning("Sessão {SessionId} não encontrada para utilizador {UserId}", sessionId, userId);
                return null;
            }

            if (updateDto.Title != null)
            {
                session.Title = updateDto.Title;
            }

            if (updateDto.IsActive.HasValue)
            {
                session.IsActive = updateDto.IsActive.Value;
            }

            session.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Sessão {SessionId} atualizada", sessionId);

            var messageCount = await _context.ChatMessages
                .CountAsync(m => m.SessionId == sessionId, cancellationToken);

            return new ChatSessionDto
            {
                Id = session.Id,
                UserId = session.UserId,
                Title = session.Title,
                CreatedAt = session.CreatedAt,
                UpdatedAt = session.UpdatedAt,
                IsActive = session.IsActive,
                MessageCount = messageCount
            };
        }

        public async Task<bool> DeleteSessionAsync(string sessionId, string userId, CancellationToken cancellationToken = default)
        {
            var session = await _context.ChatSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId, cancellationToken);

            if (session == null)
            {
                _logger.LogWarning("Sessão {SessionId} não encontrada para eliminação", sessionId);
                return false;
            }

            _context.ChatSessions.Remove(session);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Sessão {SessionId} eliminada", sessionId);
            return true;
        }

        public async Task<AddMessageResultDto> AddMessageAsync(string sessionId, string role, string content, CancellationToken cancellationToken = default)
        {
            var message = new ChatMessage
            {
                Id = Guid.NewGuid().ToString(),
                SessionId = sessionId,
                Role = role,
                Content = content,
                Timestamp = DateTime.UtcNow
            };

            _context.ChatMessages.Add(message);

            bool titleUpdated = false;
            string? updatedTitle = null;

            // Atualizar timestamp da sessão
            var session = await _context.ChatSessions
                .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

            if (session != null)
            {
                session.UpdatedAt = DateTime.UtcNow;
                
                // Auto-gerar título se for a primeira mensagem do utilizador
                if (role == "user" && session.Title == "Nova Conversa")
                {
                    var messageCount = await _context.ChatMessages
                        .CountAsync(m => m.SessionId == sessionId, cancellationToken);
                    
                    if (messageCount == 0) // Esta será a primeira mensagem
                    {
                        session.Title = await GenerateSessionTitleAsync(content, cancellationToken);
                        titleUpdated = true;
                        updatedTitle = session.Title;
                    }
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            return new AddMessageResultDto
            {
                Message = new ChatMessageDto
                {
                    Id = message.Id,
                    SessionId = message.SessionId,
                    Role = message.Role,
                    Content = message.Content,
                    Timestamp = message.Timestamp
                },
                TitleUpdated = titleUpdated,
                UpdatedTitle = updatedTitle
            };
        }

        public async Task<ChatSessionDto> GetOrCreateActiveSessionAsync(string userId, CancellationToken cancellationToken = default)
        {
            // Procurar sessão ativa mais recente
            var activeSession = await _context.ChatSessions
                .Where(s => s.UserId == userId && s.IsActive)
                .OrderByDescending(s => s.UpdatedAt)
                .FirstOrDefaultAsync(cancellationToken);

            if (activeSession != null)
            {
                var messageCount = await _context.ChatMessages
                    .CountAsync(m => m.SessionId == activeSession.Id, cancellationToken);

                return new ChatSessionDto
                {
                    Id = activeSession.Id,
                    UserId = activeSession.UserId,
                    Title = activeSession.Title,
                    CreatedAt = activeSession.CreatedAt,
                    UpdatedAt = activeSession.UpdatedAt,
                    IsActive = activeSession.IsActive,
                    MessageCount = messageCount
                };
            }

            // Criar nova sessão se não existir
            return await CreateSessionAsync(userId, "Nova Conversa", cancellationToken);
        }

        public async Task<string> GenerateSessionTitleAsync(string firstMessage, CancellationToken cancellationToken = default)
        {
            // Gerar título simples baseado na primeira mensagem
            // Limitar a 50 caracteres
            var title = firstMessage.Length > 50 
                ? firstMessage.Substring(0, 47) + "..." 
                : firstMessage;

            // Remover quebras de linha
            title = title.Replace("\n", " ").Replace("\r", " ");

            // Se estiver vazio, usar título padrão
            if (string.IsNullOrWhiteSpace(title))
            {
                title = "Nova Conversa";
            }

            return await Task.FromResult(title);
        }
    }
}
