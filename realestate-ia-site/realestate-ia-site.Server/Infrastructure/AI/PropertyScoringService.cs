using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.Features.Properties.Scoring;
using realestate_ia_site.Server.Application.Features.AI.Conversation;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using OpenAI.Chat;
using System.Text.Json;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    /// <summary>
    /// Serviço que usa IA para pontuar propriedades baseado em contexto conversacional.
    /// Implementa ordenação inteligente que considera:
    /// - Intenção do usuário na query
    /// - Histórico de refinamentos
    /// - Padrões de preferência
    /// - Contexto da conversa
    /// </summary>
    public class PropertyScoringService : IPropertyScoringService
    {
        private readonly IOpenAIService _openAIService;
        private readonly IConversationContextService _contextService;
        private readonly ILogger<PropertyScoringService> _logger;

        public PropertyScoringService(
            IOpenAIService openAIService,
            IConversationContextService contextService,
            ILogger<PropertyScoringService> logger)
        {
            _openAIService = openAIService;
            _contextService = contextService;
            _logger = logger;
        }

        public async Task<List<PropertySearchDto>> ScoreAndRankPropertiesAsync(
            List<PropertySearchDto> properties,
            string userQuery,
            string sessionId,
            Dictionary<string, object> filters,
            CancellationToken cancellationToken = default)
        {
            if (!properties.Any())
                return properties;

            _logger.LogInformation("[Scoring] Iniciando scoring inteligente para {Count} propriedades", properties.Count);

            // Obter contexto conversacional
            var context = !string.IsNullOrWhiteSpace(sessionId)
                ? await _contextService.GetOrCreateContextAsync(sessionId, cancellationToken)
                : null;

            // Calcular scores base (sem IA) - rápido e sempre disponível
            var scoredProperties = properties.Select(p => new
            {
                Property = p,
                BaseScore = CalculateBaseScore(p, filters, context)
            }).ToList();

            // Se temos contexto suficiente, usar IA para refinar scores
            if (context?.Messages.Count > 2)
            {
                try
                {
                    var aiScores = await GetAIContextualScoresAsync(
                        properties, 
                        userQuery, 
                        context, 
                        filters, 
                        cancellationToken);

                    // Combinar scores: 60% base + 40% IA
                    scoredProperties = scoredProperties.Select(sp =>
                    {
                        var aiScore = aiScores.GetValueOrDefault(sp.Property.Id, 0.5);
                        var finalScore = (sp.BaseScore * 0.6) + (aiScore * 0.4);
                        
                        return new
                        {
                            sp.Property,
                            BaseScore = finalScore
                        };
                    }).ToList();

                    _logger.LogInformation("[Scoring] Scores refinados com IA contextual");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[Scoring] Falha ao obter scores da IA, usando apenas base scores");
                }
            }

            // Ordenar por score final
            var rankedProperties = scoredProperties
                .OrderByDescending(sp => sp.BaseScore)
                .Select(sp => sp.Property)
                .ToList();

            _logger.LogInformation("[Scoring] Propriedades ordenadas por relevância contextual");
            return rankedProperties;
        }

        /// <summary>
        /// Calcula score base usando heurísticas rápidas (sem IA).
        /// </summary>
        private double CalculateBaseScore(
            PropertySearchDto property, 
            Dictionary<string, object> filters,
            ConversationContext? context)
        {
            double score = 0.5; // Score neutro base

            // 1. Proximidade ao preço alvo (se especificado)
            if (filters.TryGetValue("target_price", out var targetPriceObj) 
                && decimal.TryParse(targetPriceObj?.ToString(), out var targetPrice)
                && property.Price > 0)
            {
                var priceDiff = Math.Abs((double)(property.Price - targetPrice));
                var priceProximity = 1.0 - Math.Min(priceDiff / (double)targetPrice, 1.0);
                score += priceProximity * 0.3; // 30% do score
            }

            // 2. Proximidade à área alvo (se especificado)
            if (filters.TryGetValue("target_area", out var targetAreaObj) 
                && double.TryParse(targetAreaObj?.ToString(), out var targetArea)
                && property.Area > 0)
            {
                var areaDiff = Math.Abs(property.Area - targetArea);
                var areaProximity = 1.0 - Math.Min(areaDiff / targetArea, 1.0);
                score += areaProximity * 0.2; // 20% do score
            }

            // 3. Boost para propriedades recentes (últimos 7 dias)
            var daysSinceCreation = (DateTime.UtcNow - property.CreatedAt)?.TotalDays ?? 0;
            if (daysSinceCreation <= 7)
            {
                score += 0.15 * (1.0 - (daysSinceCreation / 7.0));
            }

            // 4. Boost para propriedades com queda de preço
            if (property.HadRecentPriceChange && property.PriceChangePercentage < 0)
            {
                var discountBoost = Math.Min(Math.Abs((double)property.PriceChangePercentage) / 100.0, 0.2);
                score += discountBoost;
            }

            // 5. Penalidade para propriedades sem preço
            if (property.Price <= 0)
            {
                score -= 0.3;
            }

            // 6. Completude dos dados (sem considerar imagem)
            var completeness = CalculateDataCompleteness(property);
            score += completeness * 0.1;

            return Math.Clamp(score, 0.0, 1.0);
        }

        /// <summary>
        /// Usa IA para gerar scores contextuais baseados na conversa.
        /// </summary>
        private async Task<Dictionary<string, double>> GetAIContextualScoresAsync(
            List<PropertySearchDto> properties,
            string userQuery,
            ConversationContext context,
            Dictionary<string, object> filters,
            CancellationToken cancellationToken)
        {
            // Criar prompt para IA analisar relevância contextual
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um assistente especializado em avaliar relevância de propriedades.
Analisa o contexto da conversa e a query do utilizador para determinar quais propriedades são mais relevantes.

TAREFA: Para cada propriedade, retorna um score de 0.0 a 1.0 indicando relevância contextual.
Considera:
- Padrão de refinamento do utilizador
- Preferências implícitas nas queries anteriores
- Consistência com o que o utilizador está a procurar
- Detalhes específicos mencionados

Responde APENAS com JSON: {""property_id"": score, ...}"),
                
                new UserChatMessage($@"Query atual: {userQuery}

Histórico de refinamentos:
{string.Join("\n", context.Messages.TakeLast(4).Select(m => $"- {m.Content}"))}

Propriedades a avaliar (ID: características):
{string.Join("\n", properties.Take(10).Select(p => 
    $"{p.Id}: {p.Type} em {p.Location}, {p.Bedrooms}Q, {p.Area}m², €{p.Price:N0}"))}

Retorna scores de relevância contextual:")
            };

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 500,
                Temperature = 0.3f
            };

            try
            {
                var response = await _openAIService.CompleteChatAsync(
                    messages, 
                    options, 
                    "gpt-4o-mini", // Modelo rápido para scoring
                    cancellationToken);

                var scores = JsonSerializer.Deserialize<Dictionary<string, double>>(response);
                return scores ?? new Dictionary<string, double>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[Scoring] Erro ao obter scores contextuais da IA");
                return new Dictionary<string, double>();
            }
        }

        /// <summary>
        /// Calcula completude dos dados da propriedade (0.0 a 1.0).
        /// Não considera ImageUrl pois campo não está preenchido.
        /// </summary>
        private double CalculateDataCompleteness(PropertySearchDto property)
        {
            int filledFields = 0;
            int totalFields = 7;

            if (!string.IsNullOrWhiteSpace(property.Title)) filledFields++;
            if (!string.IsNullOrWhiteSpace(property.Description)) filledFields++;
            if (property.Price > 0) filledFields++;
            if (property.Area > 0) filledFields++;
            if (property.Bedrooms > 0) filledFields++;
            if (property.Bathrooms > 0) filledFields++;
            if (!string.IsNullOrWhiteSpace(property.Location)) filledFields++;

            return (double)filledFields / totalFields;
        }

        public async Task LearnFromRefinementAsync(
            string sessionId,
            string userId,
            Dictionary<string, object> previousFilters,
            Dictionary<string, object> newFilters,
            CancellationToken cancellationToken = default)
        {
            // Identificar o que mudou
            var changes = new List<string>();
            
            foreach (var filter in newFilters)
            {
                if (!previousFilters.ContainsKey(filter.Key))
                {
                    changes.Add($"Adicionou: {filter.Key}={filter.Value}");
                }
                else if (!previousFilters[filter.Key].Equals(filter.Value))
                {
                    changes.Add($"Mudou: {filter.Key} de {previousFilters[filter.Key]} para {filter.Value}");
                }
            }

            foreach (var filter in previousFilters)
            {
                if (!newFilters.ContainsKey(filter.Key))
                {
                    changes.Add($"Removeu: {filter.Key}");
                }
            }

            if (changes.Any())
            {
                _logger.LogInformation(
                    "[Learning] Usuário {UserId} refinou pesquisa na sessão {SessionId}: {Changes}",
                    userId,
                    sessionId,
                    string.Join(", ", changes));

                // TODO: Armazenar padrões de refinamento para análise futura
                // Pode ser usado para:
                // - Sugerir refinamentos comuns
                // - Melhorar interpretação de queries ambíguas
                // - Personalizar ordenação baseada em preferências do usuário
            }
        }
    }
}
