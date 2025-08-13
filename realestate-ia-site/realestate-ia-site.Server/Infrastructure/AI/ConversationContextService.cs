using Microsoft.Extensions.Caching.Memory;
using realestate_ia_site.Server.Domain.Models;
using realestate_ia_site.Server.Infrastructure.AI.Interfaces;
using realestate_ia_site.Server.Infrastructure.AI.Prompts; 

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public sealed class ConversationContextService : IConversationContextService
    {
        private readonly IMemoryCache _cache;
        private readonly ILogger<ConversationContextService> _logger;
        private readonly TimeSpan _contextExpiry = TimeSpan.FromMinutes(30);

        public ConversationContextService(
            IMemoryCache cache, 
            ILogger<ConversationContextService> logger)
        {
            _cache = cache;
            _logger = logger;
        }

        public ConversationContext GetOrCreateContext(string sessionId)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(sessionId, nameof(sessionId));

            var cacheKey = GetCacheKey(sessionId);
            
            if (_cache.TryGetValue(cacheKey, out ConversationContext? context) && context != null)
            {
                _logger.LogDebug("Contexto recuperado para sessão: {SessionId}", sessionId);
                return context;
            }

            return CreateNewContext(sessionId, cacheKey);
        }

        public async Task<ConversationContext> GetOrCreateContextAsync(
            string sessionId, 
            CancellationToken cancellationToken = default)
        {
            return await Task.FromResult(GetOrCreateContext(sessionId));
        }

        public void UpdateContext(string sessionId, ConversationContext context)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(sessionId, nameof(sessionId));
            ArgumentNullException.ThrowIfNull(context, nameof(context));

            var cacheKey = GetCacheKey(sessionId);
            var cacheOptions = CreateCacheOptions();

            _cache.Set(cacheKey, context, cacheOptions);
            _logger.LogDebug("Contexto atualizado para sessão: {SessionId}", sessionId);
        }

        public void ClearExpiredContexts()
        {
            // O MemoryCache já gere automaticamente a expiração
            _logger.LogDebug("Limpeza automática de contextos expirados executada");
        }

        private ConversationContext CreateNewContext(string sessionId, string cacheKey)
        {
            var context = new ConversationContext { SessionId = sessionId };
            context.AddSystemMessage(AiPrompts.UnifiedPropertyAssistant); // CHANGED
            var cacheOptions = CreateCacheOptions();
            _cache.Set(cacheKey, context, cacheOptions);
            _logger.LogDebug("Novo contexto criado para sessão: {SessionId}", sessionId);
            return context;
        }

        private static string GetCacheKey(string sessionId) => $"conversation_{sessionId}";

        private MemoryCacheEntryOptions CreateCacheOptions()
        {
            return new MemoryCacheEntryOptions
            {
                SlidingExpiration = _contextExpiry,
                Priority = CacheItemPriority.Normal,
                Size = 1
            };
        }
    }
}