using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Application.Common.Interfaces;

namespace realestate_ia_site.Server.Application.Features.Properties.Feedback
{
    /// <summary>
    /// Serviço para rastrear feedback implícito e explícito do usuário sobre propriedades.
    /// Usado para melhorar scoring e recomendações.
    /// </summary>
    public class PropertyFeedbackService
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<PropertyFeedbackService> _logger;

        public PropertyFeedbackService(
            IApplicationDbContext context,
            ILogger<PropertyFeedbackService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Analisa o comportamento do usuário para inferir se gostou dos resultados.
        /// </summary>
        public async Task<UserFeedbackSignals> AnalyzeUserBehaviorAsync(
            string sessionId,
            string userId,
            List<string> shownPropertyIds,
            CancellationToken cancellationToken = default)
        {
            var signals = new UserFeedbackSignals();

            // 1. Verificar se usuário visualizou alguma propriedade (clicou para ver detalhes)
            var viewedProperties = await _context.PropertyViewHistories
                .Where(v => v.UserId == userId && shownPropertyIds.Contains(v.PropertyId))
                .Select(v => v.PropertyId)
                .Distinct()
                .ToListAsync(cancellationToken);

            signals.ViewedCount = viewedProperties.Count;
            signals.ViewRate = shownPropertyIds.Any() 
                ? (double)viewedProperties.Count / shownPropertyIds.Count 
                : 0;

            // 2. Verificar se adicionou aos favoritos
            var favoritedProperties = await _context.Favorites
                .Where(f => f.UserId == userId && shownPropertyIds.Contains(f.PropertyId))
                .Select(f => f.PropertyId)
                .Distinct()
                .ToListAsync(cancellationToken);

            signals.FavoritedCount = favoritedProperties.Count;
            signals.FavoriteRate = shownPropertyIds.Any()
                ? (double)favoritedProperties.Count / shownPropertyIds.Count
                : 0;

            // 3. Verificar se fez nova pesquisa (refinamento)
            // Se fez nova pesquisa rapidamente, pode indicar que não gostou dos resultados
            var sessionMessages = await _context.ChatMessages
                .Where(m => m.SessionId == sessionId)
                .OrderBy(m => m.Timestamp)
                .ToListAsync(cancellationToken);

            var lastTwoMessages = sessionMessages.TakeLast(2).ToList();
            if (lastTwoMessages.Count >= 2)
            {
                var timeBetween = (lastTwoMessages[1].Timestamp - lastTwoMessages[0].Timestamp).TotalSeconds;
                signals.RefinedQuickly = timeBetween < 30; // Menos de 30s = não gostou
            }

            // 4. Calcular score geral de satisfação
            signals.SatisfactionScore = CalculateSatisfactionScore(signals);

            _logger.LogInformation(
                "[Feedback] Session {SessionId}: Viewed={Viewed}, Favorited={Favorited}, Satisfaction={Score:P0}",
                sessionId,
                signals.ViewedCount,
                signals.FavoritedCount,
                signals.SatisfactionScore);

            return signals;
        }

        /// <summary>
        /// Calcula score de satisfação baseado nos sinais de feedback.
        /// </summary>
        private double CalculateSatisfactionScore(UserFeedbackSignals signals)
        {
            double score = 0.5; // Neutro

            // Favoritos são sinal muito forte de satisfação
            if (signals.FavoritedCount > 0)
            {
                score += 0.4; // +40%
            }

            // Visualizações são sinal moderado
            if (signals.ViewRate > 0.5) // Viu mais de 50% dos resultados
            {
                score += 0.2; // +20%
            }
            else if (signals.ViewRate > 0.2) // Viu pelo menos 20%
            {
                score += 0.1; // +10%
            }

            // Refinamento rápido é sinal de insatisfação
            if (signals.RefinedQuickly && signals.ViewedCount == 0)
            {
                score -= 0.3; // -30% se refinou sem ver nada
            }

            return Math.Clamp(score, 0.0, 1.0);
        }

        /// <summary>
        /// Extrai padrões de propriedades que o usuário gostou (favoritou ou visualizou).
        /// </summary>
        public async Task<PropertyPreferencePattern> ExtractPreferencePatternsAsync(
            string userId,
            CancellationToken cancellationToken = default)
        {
            var pattern = new PropertyPreferencePattern();

            // Buscar propriedades favoritadas
            var favoritePropertyIds = await _context.Favorites
                .Where(f => f.UserId == userId)
                .Select(f => f.PropertyId)
                .ToListAsync(cancellationToken);

            if (!favoritePropertyIds.Any())
                return pattern;

            var favoriteProperties = await _context.Properties
                .Where(p => favoritePropertyIds.Contains(p.Id))
                .ToListAsync(cancellationToken);

            // Analisar padrões
            pattern.PreferredTypes = favoriteProperties
                .GroupBy(p => p.Type)
                .OrderByDescending(g => g.Count())
                .Take(2)
                .Select(g => g.Key)
                .ToList();

            pattern.PreferredLocations = favoriteProperties
                .GroupBy(p => p.City)
                .OrderByDescending(g => g.Count())
                .Take(3)
                .Select(g => g.Key)
                .ToList();

            pattern.AveragePriceRange = new PriceRange
            {
                Min = (favoriteProperties.Min(p => p.Price) ?? 0) * 0.8m, // -20%
                Max = (favoriteProperties.Max(p => p.Price) ?? 0) * 1.2m  // +20%
            };

            pattern.AverageAreaRange = new AreaRange
            {
                Min = (favoriteProperties.Min(p => p.Area) ?? 0) * 0.8,
                Max = (favoriteProperties.Max(p => p.Area) ?? 0) * 1.2
            };

            pattern.PreferredRooms = favoriteProperties
                .GroupBy(p => p.Bedrooms)
                .OrderByDescending(g => g.Count())
                .Select(g => g.Key)
                .FirstOrDefault();

            _logger.LogInformation(
                "[Feedback] Padrões do usuário {UserId}: Tipos={Types}, Locais={Locations}, Preço={MinPrice}-{MaxPrice}",
                userId,
                string.Join(", ", pattern.PreferredTypes),
                string.Join(", ", pattern.PreferredLocations),
                pattern.AveragePriceRange.Min,
                pattern.AveragePriceRange.Max);

            return pattern;
        }
    }

    public class UserFeedbackSignals
    {
        public int ViewedCount { get; set; }
        public double ViewRate { get; set; }
        public int FavoritedCount { get; set; }
        public double FavoriteRate { get; set; }
        public bool RefinedQuickly { get; set; }
        public double SatisfactionScore { get; set; }
    }

    public class PropertyPreferencePattern
    {
        public List<string> PreferredTypes { get; set; } = new();
        public List<string> PreferredLocations { get; set; } = new();
        public PriceRange AveragePriceRange { get; set; } = new();
        public AreaRange AverageAreaRange { get; set; } = new();
        public int? PreferredRooms { get; set; }
    }

    public class PriceRange
    {
        public decimal Min { get; set; }
        public decimal Max { get; set; }
    }

    public class AreaRange
    {
        public double Min { get; set; }
        public double Max { get; set; }
    }
}
