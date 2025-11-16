using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Application.Features.Chat.Interfaces;
using realestate_ia_site.Server.Domain.Entities;
using System.Text.Json;

namespace realestate_ia_site.Server.Infrastructure.Chat
{
    public class ChatSessionPropertyService : IChatSessionPropertyService
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<ChatSessionPropertyService> _logger;

        public ChatSessionPropertyService(
            IApplicationDbContext context,
            ILogger<ChatSessionPropertyService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task AddPropertiesToSessionAsync(string sessionId, IEnumerable<string> propertyIds, CancellationToken cancellationToken = default)
        {
            await AddPropertiesToSessionAsync(sessionId, propertyIds, null, cancellationToken);
        }

        public async Task AddPropertiesToSessionAsync(
            string sessionId, 
            IEnumerable<string> propertyIds, 
            Dictionary<string, List<string>>? matchedFeatures,
            CancellationToken cancellationToken = default)
        {
            try
            {
                // Limpar propriedades anteriores desta sessão
                await ClearSessionPropertiesAsync(sessionId, cancellationToken);

                var propertyIdList = propertyIds.ToList();
                var sessionProperties = new List<ChatSessionProperty>();

                for (int i = 0; i < propertyIdList.Count; i++)
                {
                    var propertyId = propertyIdList[i];
                    var sessionProperty = new ChatSessionProperty
                    {
                        Id = Guid.NewGuid().ToString(),
                        SessionId = sessionId,
                        PropertyId = propertyId,
                        DisplayOrder = i,
                        AddedAt = DateTime.UtcNow
                    };

                    // Guardar matched features se existirem
                    if (matchedFeatures != null && matchedFeatures.TryGetValue(propertyId, out var features))
                    {
                        sessionProperty.MatchedFeaturesJson = JsonSerializer.Serialize(features);
                    }

                    sessionProperties.Add(sessionProperty);
                }

                _context.ChatSessionProperties.AddRange(sessionProperties);
                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("Adicionadas {Count} propriedades à sessão {SessionId} (com features: {HasFeatures})", 
                    propertyIdList.Count, sessionId, matchedFeatures != null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao adicionar propriedades à sessão {SessionId}", sessionId);
                throw;
            }
        }

        public async Task<List<PropertySearchDto>> GetSessionPropertiesAsync(string sessionId, CancellationToken cancellationToken = default)
        {
            try
            {
                var sessionProperties = await _context.ChatSessionProperties
                    .Where(sp => sp.SessionId == sessionId)
                    .Include(sp => sp.Property)
                    .OrderBy(sp => sp.DisplayOrder)
                    .ToListAsync(cancellationToken);

                var properties = sessionProperties.Select(sp => sp.Property!).ToList();

                // Obter histórico de preços para cada propriedade
                var propertyIds = properties.Select(p => p.Id).ToList();
                var priceHistories = await _context.PropertyPriceHistories
                    .Where(ph => propertyIds.Contains(ph.PropertyId))
                    .GroupBy(ph => ph.PropertyId)
                    .Select(g => g.OrderByDescending(ph => ph.ChangedAt).FirstOrDefault())
                    .ToListAsync(cancellationToken);

                var priceHistoryDict = priceHistories
                    .Where(ph => ph != null)
                    .ToDictionary(ph => ph!.PropertyId, ph => ph);

                var result = new List<PropertySearchDto>();
                foreach (var sp in sessionProperties)
                {
                    if (sp.Property == null) continue;

                    priceHistoryDict.TryGetValue(sp.Property.Id, out var priceHistory);
                    var dto = PropertySearchDto.FromDomain(sp.Property, priceHistory);

                    // Restaurar matched features se existirem
                    if (!string.IsNullOrWhiteSpace(sp.MatchedFeaturesJson))
                    {
                        try
                        {
                            var features = JsonSerializer.Deserialize<List<string>>(sp.MatchedFeaturesJson);
                            if (features != null && features.Any())
                            {
                                dto.MatchedFeatures = features;
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Erro ao deserializar matched features para propriedade {PropertyId}", sp.PropertyId);
                        }
                    }

                    result.Add(dto);
                }

                _logger.LogInformation("Recuperadas {Count} propriedades da sessão {SessionId}", result.Count, sessionId);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao obter propriedades da sessão {SessionId}", sessionId);
                throw;
            }
        }

        public async Task ClearSessionPropertiesAsync(string sessionId, CancellationToken cancellationToken = default)
        {
            try
            {
                var existingProperties = await _context.ChatSessionProperties
                    .Where(sp => sp.SessionId == sessionId)
                    .ToListAsync(cancellationToken);

                if (existingProperties.Any())
                {
                    _context.ChatSessionProperties.RemoveRange(existingProperties);
                    await _context.SaveChangesAsync(cancellationToken);
                    _logger.LogInformation("Removidas {Count} propriedades da sessão {SessionId}", existingProperties.Count, sessionId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao limpar propriedades da sessão {SessionId}", sessionId);
                throw;
            }
        }
    }
}
