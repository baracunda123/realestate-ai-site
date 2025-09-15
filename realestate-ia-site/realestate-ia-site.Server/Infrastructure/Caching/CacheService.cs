using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

namespace realestate_ia_site.Server.Infrastructure.Caching
{
    /// <summary>
    /// Serviço de cache com funcionalidades avançadas
    /// </summary>
    public interface ICacheService
    {
        Task<T?> GetAsync<T>(string key) where T : class;
        Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class;
        Task RemoveAsync(string key);
        Task RemoveByPatternAsync(string pattern);
        Task ClearAsync();
    }

    public class CacheService : ICacheService
    {
        private readonly IMemoryCache _memoryCache;
        private readonly ILogger<CacheService> _logger;
        private readonly HashSet<string> _cacheKeys;
        private readonly SemaphoreSlim _semaphore;

        // Configurações de cache por tipo
        private static readonly Dictionary<string, TimeSpan> CacheExpirations = new()
        {
            { "properties", TimeSpan.FromMinutes(5) },
            { "location_suggestions", TimeSpan.FromHours(1) },
            { "user_profile", TimeSpan.FromMinutes(30) },
            { "search_results", TimeSpan.FromMinutes(3) },
            { "market_data", TimeSpan.FromMinutes(15) },
            { "property_details", TimeSpan.FromMinutes(10) },
            { "similar_properties", TimeSpan.FromMinutes(20) }
        };

        public CacheService(IMemoryCache memoryCache, ILogger<CacheService> logger)
        {
            _memoryCache = memoryCache;
            _logger = logger;
            _cacheKeys = new HashSet<string>();
            _semaphore = new SemaphoreSlim(1, 1);
        }

        public async Task<T?> GetAsync<T>(string key) where T : class
        {
            try
            {
                if (_memoryCache.TryGetValue(key, out var cachedValue))
                {
                    _logger.LogDebug("Cache hit for key: {Key}", key);
                    
                    if (cachedValue is string jsonString)
                    {
                        return JsonSerializer.Deserialize<T>(jsonString);
                    }
                    
                    return cachedValue as T;
                }

                _logger.LogDebug("Cache miss for key: {Key}", key);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cached value for key: {Key}", key);
                return null;
            }
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null) where T : class
        {
            try
            {
                await _semaphore.WaitAsync();
                
                var options = new MemoryCacheEntryOptions();
                
                // Determinar expiração baseada no tipo ou usar padrão
                var expirationTime = expiration ?? GetDefaultExpiration(key) ?? TimeSpan.FromMinutes(10);
                options.SetAbsoluteExpiration(expirationTime);
                
                // Callback para remover da lista de chaves quando expira
                options.RegisterPostEvictionCallback((k, v, reason, state) =>
                {
                    if (reason == EvictionReason.Expired || reason == EvictionReason.Removed)
                    {
                        lock (_cacheKeys)
                        {
                            _cacheKeys.Remove(key);
                        }
                        _logger.LogDebug("Cache entry removed: {Key}, Reason: {Reason}", key, reason);
                    }
                });

                // Serializar para JSON se necessário
                object cacheValue;
                if (typeof(T) == typeof(string))
                {
                    cacheValue = value;
                }
                else
                {
                    cacheValue = JsonSerializer.Serialize(value);
                }
                
                _memoryCache.Set(key, cacheValue, options);
                
                lock (_cacheKeys)
                {
                    _cacheKeys.Add(key);
                }
                
                _logger.LogDebug("Cache set for key: {Key}, Expiration: {Expiration}", key, expirationTime);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting cache for key: {Key}", key);
            }
            finally
            {
                _semaphore.Release();
            }
        }

        public async Task RemoveAsync(string key)
        {
            try
            {
                await _semaphore.WaitAsync();
                
                _memoryCache.Remove(key);
                
                lock (_cacheKeys)
                {
                    _cacheKeys.Remove(key);
                }
                
                _logger.LogDebug("Cache removed for key: {Key}", key);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing cache for key: {Key}", key);
            }
            finally
            {
                _semaphore.Release();
            }
        }

        public async Task RemoveByPatternAsync(string pattern)
        {
            try
            {
                await _semaphore.WaitAsync();
                
                List<string> keysToRemove;
                
                lock (_cacheKeys)
                {
                    keysToRemove = _cacheKeys
                        .Where(key => key.Contains(pattern, StringComparison.OrdinalIgnoreCase))
                        .ToList();
                }
                
                foreach (var key in keysToRemove)
                {
                    _memoryCache.Remove(key);
                    lock (_cacheKeys)
                    {
                        _cacheKeys.Remove(key);
                    }
                }
                
                _logger.LogDebug("Removed {Count} cache entries matching pattern: {Pattern}", 
                    keysToRemove.Count, pattern);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing cache by pattern: {Pattern}", pattern);
            }
            finally
            {
                _semaphore.Release();
            }
        }

        public async Task ClearAsync()
        {
            try
            {
                await _semaphore.WaitAsync();
                
                List<string> allKeys;
                
                lock (_cacheKeys)
                {
                    allKeys = _cacheKeys.ToList();
                    _cacheKeys.Clear();
                }
                
                foreach (var key in allKeys)
                {
                    _memoryCache.Remove(key);
                }
                
                _logger.LogInformation("Cache cleared. Removed {Count} entries", allKeys.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error clearing cache");
            }
            finally
            {
                _semaphore.Release();
            }
        }

        private static TimeSpan? GetDefaultExpiration(string key)
        {
            foreach (var kvp in CacheExpirations)
            {
                if (key.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase))
                {
                    return kvp.Value;
                }
            }
            
            return null;
        }
    }

    /// <summary>
    /// Extensões para facilitar o uso do cache
    /// </summary>
    public static class CacheServiceExtensions
    {
        /// <summary>
        /// Get or Set pattern - busca no cache ou executa função e armazena resultado
        /// </summary>
        public static async Task<T> GetOrSetAsync<T>(
            this ICacheService cacheService, 
            string key, 
            Func<Task<T>> getItem, 
            TimeSpan? expiration = null) where T : class
        {
            var cachedValue = await cacheService.GetAsync<T>(key);
            
            if (cachedValue != null)
            {
                return cachedValue;
            }
            
            var item = await getItem();
            
            if (item != null)
            {
                await cacheService.SetAsync(key, item, expiration);
            }
            
            return item;
        }

        /// <summary>
        /// Gera chave de cache baseada em parâmetros
        /// </summary>
        public static string GenerateCacheKey(string prefix, params object[] parameters)
        {
            var keyParts = new List<string> { prefix };
            
            foreach (var param in parameters)
            {
                if (param != null)
                {
                    keyParts.Add(param.ToString()!);
                }
            }
            
            return string.Join(":", keyParts);
        }
    }

    /// <summary>
    /// Atributo para marcar métodos que devem ser cached
    /// </summary>
    [AttributeUsage(AttributeTargets.Method)]
    public class CacheableAttribute : Attribute
    {
        public TimeSpan Duration { get; set; }
        public string KeyPrefix { get; set; } = string.Empty;

        public CacheableAttribute(int minutes = 10, string keyPrefix = "")
        {
            Duration = TimeSpan.FromMinutes(minutes);
            KeyPrefix = keyPrefix;
        }
    }
}