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
                _logger.LogDebug("Contexto recuperado do cache para sessão: {SessionId}", sessionId);
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
        
        public ConversationContext? GetContext(string sessionId)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(sessionId, nameof(sessionId));
            var cacheKey = GetCacheKey(sessionId);
            if (_cache.TryGetValue(cacheKey, out ConversationContext? context) && context != null)
            {
                return context;
            }
            return null;
        }

        public async Task<ConversationContext> GetOrCreateContextAsync(string sessionId, CancellationToken cancellationToken = default)
            => await Task.FromResult(GetOrCreateContext(sessionId));

        public void UpdateContext(string sessionId, ConversationContext context)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(sessionId, nameof(sessionId));
            ArgumentNullException.ThrowIfNull(context, nameof(context));
            
            // 1. Atualizar cache (rápido)
            var cacheKey = GetCacheKey(sessionId);
            var cacheOptions = CreateCacheOptions();
            _cache.Set(cacheKey, context, cacheOptions);
            
            // 2. Persistir na BD (durável)
            try
            {
                var contextData = _context.ConversationContexts
                    .FirstOrDefault(c => c.SessionId == sessionId);
                
                if (contextData == null)
                {
                    contextData = new ConversationContextData
                    {
                        SessionId = sessionId
                    };
                    _context.ConversationContexts.Add(contextData);
                }
                
                SerializeContext(context, contextData);
                _context.SaveChangesAsync().Wait();
                
                _logger.LogDebug("Contexto atualizado (cache + BD) para sessão: {SessionId}", sessionId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao persistir contexto na BD para sessão: {SessionId}", sessionId);
                // Continua mesmo se falhar - pelo menos está no cache
            }
        }
        
        public void ClearContext(string sessionId)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(sessionId, nameof(sessionId));
            
            // 1. Remover do cache
            var cacheKey = GetCacheKey(sessionId);
            _cache.Remove(cacheKey);
            
            // 2. Remover da BD
            try
            {
                var contextData = _context.ConversationContexts
                    .FirstOrDefault(c => c.SessionId == sessionId);
                
                if (contextData != null)
                {
                    _context.ConversationContexts.Remove(contextData);
                    _context.SaveChangesAsync().Wait();
                }
                
                _logger.LogInformation("Contexto removido (cache + BD) para sessão: {SessionId}", sessionId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao remover contexto da BD para sessão: {SessionId}", sessionId);
            }
        }

        public void ClearExpiredContexts()
        {
            try
            {
                var cutoffDate = DateTime.UtcNow - _dbExpiry;
                
                var expiredContexts = _context.ConversationContexts
                    .Where(c => c.LastActivity < cutoffDate)
                    .ToList();
                
                if (expiredContexts.Any())
                {
                    _context.ConversationContexts.RemoveRange(expiredContexts);
                    _context.SaveChangesAsync().Wait();
                    
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

        private ConversationContext CreateNewContext(string sessionId, string cacheKey)
        {
            var context = new ConversationContext { SessionId = sessionId };
            var cacheOptions = CreateCacheOptions();
            _cache.Set(cacheKey, context, cacheOptions);
            _logger.LogDebug("Novo contexto criado para sessão: {SessionId}", sessionId);
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
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Erro ao deserializar contexto da BD para sessão: {SessionId}", data.SessionId);
            }
            
            return context;
        }
    }
}
