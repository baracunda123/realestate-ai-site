using Microsoft.Extensions.Caching.Memory;
using realestate_ia_site.Server.Domain.Models;
using realestate_ia_site.Server.Infrastructure.AI.Interfaces;

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
            
            // Adicionar mensagem do sistema inicial
            context.AddSystemMessage(GetSystemPrompt());

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

        private static string GetSystemPrompt()
        {
            return @"És um assistente imobiliário especializado em Portugal. 
                    Mantém o contexto da conversa e refere-te a propriedades ou filtros mencionados anteriormente quando relevante.
                    Se o utilizador fizer uma pergunta de seguimento (ex: 'e em Lisboa?', 'mais baratos?'), 
                    considera os critérios da pesquisa anterior e ajuda a refinar a busca.
                    
                    Regras importantes:
                    - Sempre apresenta propriedades da lista fornecida
                    - Usa linguagem natural e amigável
                    - Considera o histórico da conversa para dar respostas contextuais";
        }
    }
}