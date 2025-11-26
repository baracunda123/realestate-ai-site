using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using realestate_ia_site.Server.Application.Features.AI.Conversation;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public sealed class ConversationContextService : IConversationContextService
    {
        private readonly IMemoryCache _cache;
        private readonly IApplicationDbContext _context;
        private readonly ILogger<ConversationContextService> _logger;
        private readonly TimeSpan _cacheExpiry = TimeSpan.FromHours(2); // Cache em memória
        private readonly TimeSpan _dbExpiry = TimeSpan.FromDays(3); // Persistência na BD

        public ConversationContextService(
            IMemoryCache cache,
            IApplicationDbContext context,
            ILogger<ConversationContextService> logger)
        {
            _cache = cache;
            _context = context;
            _logger = logger;
        }

        public ConversationContext GetOrCreateContext(string sessionId)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(sessionId, nameof(sessionId));
            var cacheKey = GetCacheKey(sessionId);
            
            // 1. Tentar cache primeiro (rápido)
            if (_cache.TryGetValue(cacheKey, out ConversationContext? context) && context != null)
            {
                _logger.LogInformation("Contexto recuperado do cache para sessão: {SessionId}", sessionId);
                return context;
            }
            
            // 2. Tentar BD (persistente)
            var contextData = _context.ConversationContexts
                .FirstOrDefault(c => c.SessionId == sessionId);
            
            if (contextData != null)
            {
                context = DeserializeContext(contextData);
                
                // Guardar no cache para próximas chamadas
                var cacheOptions = CreateCacheOptions();
                _cache.Set(cacheKey, context, cacheOptions);
                
                _logger.LogInformation("Contexto recuperado da BD para sessão: {SessionId}", sessionId);
                return context;
            }
            
            // 3. Criar novo
            return CreateNewContext(sessionId, cacheKey);
        }

        public async Task<ConversationContext> GetOrCreateContextAsync(string sessionId, CancellationToken cancellationToken = default)
            => await Task.FromResult(GetOrCreateContext(sessionId));

        public async Task UpdateContextAsync(string sessionId, ConversationContext context, CancellationToken cancellationToken = default)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(sessionId, nameof(sessionId));
            ArgumentNullException.ThrowIfNull(context, nameof(context));
            
            // 1. Atualizar cache (rápido) - SEMPRE
            var cacheKey = GetCacheKey(sessionId);
            var cacheOptions = CreateCacheOptions();
            _cache.Set(cacheKey, context, cacheOptions);
            
            // 2. Tentar persistir na BD (durável) - Apenas para sessões autenticadas
            // Para sessões anónimas (sessionId do middleware), isto falhará silenciosamente
            try
            {
                var contextData = await _context.ConversationContexts
                    .FirstOrDefaultAsync(c => c.SessionId == sessionId, cancellationToken);
                
                if (contextData == null)
                {
                    // Verificar se esta sessão já existe na tabela ChatSessions (utilizador autenticado)
                    var chatSessionExists = await _context.ChatSessions.AnyAsync(s => s.Id == sessionId, cancellationToken);
                    
                    if (chatSessionExists)
                    {
                        // Sessão autenticada - criar entrada na BD
                        contextData = new ConversationContextData
                        {
                            SessionId = sessionId
                        };
                        _context.ConversationContexts.Add(contextData);
                        
                        SerializeContext(context, contextData);
                        await _context.SaveChangesAsync(cancellationToken);
                        
                        _logger.LogDebug("Contexto criado e persistido na BD para sessão autenticada: {SessionId}", sessionId);
                    }
                    else
                    {
                        // Sessão anónima - NÃO persistir (apenas cache)
                        _logger.LogDebug("Contexto atualizado APENAS em cache (sessão anónima): {SessionId}", sessionId);
                    }
                }
                else
                {
                    // Contexto já existe - atualizar
                    SerializeContext(context, contextData);
                    await _context.SaveChangesAsync(cancellationToken);
                    
                    _logger.LogDebug("Contexto atualizado (cache + BD) para sessão autenticada: {SessionId}", sessionId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Não foi possível persistir contexto na BD para sessão: {SessionId} (provavelmente anónima)", sessionId);
                // Continua mesmo se falhar - pelo menos está no cache
            }
        }
        
        public async Task ClearContextAsync(string sessionId, CancellationToken cancellationToken = default)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(sessionId, nameof(sessionId));
            
            // 1. Remover do cache
            var cacheKey = GetCacheKey(sessionId);
            _cache.Remove(cacheKey);
            
            // 2. Remover da BD
            try
            {
                var contextData = await _context.ConversationContexts
                    .FirstOrDefaultAsync(c => c.SessionId == sessionId, cancellationToken);
                
                if (contextData != null)
                {
                    _context.ConversationContexts.Remove(contextData);
                    await _context.SaveChangesAsync(cancellationToken);
                }
                
                _logger.LogInformation("Contexto removido (cache + BD) para sessão: {SessionId}", sessionId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao remover contexto da BD para sessão: {SessionId}", sessionId);
            }
        }

        public async Task ClearExpiredContextsAsync(CancellationToken cancellationToken = default)
        {
            try
            {
                var cutoffDate = DateTime.UtcNow - _dbExpiry;
                
                var expiredContexts = await _context.ConversationContexts
                    .Where(c => c.LastActivity < cutoffDate)
                    .ToListAsync(cancellationToken);
                
                if (expiredContexts.Any())
                {
                    _context.ConversationContexts.RemoveRange(expiredContexts);
                    await _context.SaveChangesAsync(cancellationToken);
                    
                    _logger.LogInformation(
                        "Limpeza automática: {Count} contextos expirados removidos (inativos há mais de {Days} dias)",
                        expiredContexts.Count,
                        _dbExpiry.TotalDays);
                }
                else
                {
                    _logger.LogDebug("Limpeza automática: Nenhum contexto expirado encontrado");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao limpar contextos expirados");
            }
        }

        /// <summary>
        /// Restaura o contexto da BD para o cache (útil ao voltar para uma conversa anterior)
        /// </summary>
        public ConversationContext? RestoreContextFromDatabase(string sessionId)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(sessionId, nameof(sessionId));
            var cacheKey = GetCacheKey(sessionId);
            
            try
            {
                // Buscar na BD
                var contextData = _context.ConversationContexts
                    .FirstOrDefault(c => c.SessionId == sessionId);
                
                if (contextData == null)
                {
                    _logger.LogDebug("Nenhum contexto encontrado na BD para sessão: {SessionId}", sessionId);
                    return null;
                }
                
                // Deserializar
                var context = DeserializeContext(contextData);
                
                // Guardar no cache
                var cacheOptions = CreateCacheOptions();
                _cache.Set(cacheKey, context, cacheOptions);
                
                _logger.LogInformation(
                    "Contexto restaurado da BD para cache - Sessão: {SessionId}, Filtros: {HasFilters}, Histórico: {HistoryCount}",
                    sessionId,
                    context.LastFilters.Any(),
                    context.FilterHistory.Count);
                
                return context;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao restaurar contexto da BD para sessão: {SessionId}", sessionId);
                return null;
            }
        }

        private ConversationContext CreateNewContext(string sessionId, string cacheKey)
        {
            var context = new ConversationContext { SessionId = sessionId };
            var cacheOptions = CreateCacheOptions();
            _cache.Set(cacheKey, context, cacheOptions);
            _logger.LogInformation("Novo contexto criado para sessão: {SessionId}", sessionId);
            return context;
        }

        private static string GetCacheKey(string sessionId) => $"conversation_{sessionId}";

        private MemoryCacheEntryOptions CreateCacheOptions() => new()
        {
            SlidingExpiration = _cacheExpiry,
            Priority = CacheItemPriority.Normal,
            Size = 1
        };
        
        /// <summary>
        /// Serializa ConversationContext para ConversationContextData (BD)
        /// </summary>
        private void SerializeContext(ConversationContext context, ConversationContextData data)
        {
            data.LastFiltersJson = JsonSerializer.Serialize(context.LastFilters);
            data.FilterHistoryJson = JsonSerializer.Serialize(context.FilterHistory);
            data.LastQuery = context.LastQuery;
            data.LastActivity = DateTime.UtcNow;
            data.UpdatedAt = DateTime.UtcNow;
        }
        
        /// <summary>
        /// Deserializa ConversationContextData (BD) para ConversationContext
        /// </summary>
        private ConversationContext DeserializeContext(ConversationContextData data)
        {
            var context = new ConversationContext
            {
                SessionId = data.SessionId
            };
            
            try
            {
                var lastFilters = JsonSerializer.Deserialize<Dictionary<string, object>>(data.LastFiltersJson);
                if (lastFilters != null)
                {
                    context.LastFilters = lastFilters;
                }
                
                var filterHistory = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(data.FilterHistoryJson);
                if (filterHistory != null)
                {
                    foreach (var filters in filterHistory)
                    {
                        context.FilterHistory.Add(filters);
                    }
                }
                
                var chatMessages = _context.ChatMessages
                    .Where(m => m.SessionId == data.SessionId)
                    .OrderByDescending(m => m.Timestamp)
                    .Take(6) // Últimas 6 mensagens (3 pares user+assistant)
                    .ToList();
                
                // Reverter para ordem cronológica (mais antiga primeiro)
                chatMessages.Reverse();
                
                foreach (var msg in chatMessages)
                {
                    if (msg.Role == "user")
                    {
                        context.AddUserMessage(msg.Content);
                    }
                    else if (msg.Role == "assistant")
                    {
                        context.AddAssistantMessage(msg.Content);
                    }
                }
                
                _logger.LogInformation("Contexto restaurado com {MessageCount} mensagens da BD", chatMessages.Count);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Erro ao deserializar contexto da BD para sessão: {SessionId}", data.SessionId);
            }
            
            return context;
        }
    }
}
