using OpenAI.Chat;
using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using System.Text.Json;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    /// <summary>
    /// Motor de recomendação que usa IA para entender padrões de comportamento
    /// e sugerir propriedades personalizadas
    /// </summary>
    public class IntelligentRecommendationEngine : IIntelligentRecommendationEngine
    {
        private readonly IOpenAIService _openAIService;
        private readonly ILogger<IntelligentRecommendationEngine> _logger;

        public IntelligentRecommendationEngine(
            IOpenAIService openAIService,
            ILogger<IntelligentRecommendationEngine> logger)
        {
            _openAIService = openAIService;
            _logger = logger;
        }

        /// <summary>
        /// Analisa o comportamento do utilizador e gera recomendações personalizadas
        /// </summary>
        public async Task<RecommendationInsights> AnalyzeUserBehaviorAsync(
            UserBehaviorData behaviorData,
            CancellationToken cancellationToken = default)
        {
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um especialista em análise de comportamento de utilizadores imobiliários.

TAREFA: Analisa o comportamento do utilizador e identifica padrões e preferências.

Analisa:
1. PADRÕES DE PESQUISA: O que procura consistentemente?
2. EVOLUÇÃO: Como as suas pesquisas mudaram ao longo do tempo?
3. PREFERÊNCIAS IMPLÍCITAS: O que valoriza mas não diz explicitamente?
4. BUDGET_REAL: Qual o orçamento real vs declarado?
5. COMPROMISSOS: O que está disposto a sacrificar?
6. PRÓXIMOS_PASSOS: O que deve procurar a seguir?
7. ALERTAS: Propriedades específicas que deve ver
8. SCORE_CONFIANÇA: 0-10 (quão confiante estás na análise)

Responde APENAS com JSON:
{
  ""searchPatterns"": [""padrão1"", ""padrão2""],
  ""evolution"": ""descrição da evolução"",
  ""implicitPreferences"": [""pref1"", ""pref2""],
  ""realBudget"": {""min"": 200000, ""max"": 350000},
  ""willingToCompromise"": [""área"", ""localização secundária""],
  ""nextSteps"": [""ação1"", ""ação2""],
  ""mustSeeProperties"": [""critério1"", ""critério2""],
  ""confidenceScore"": 8
}"),
                
                new UserChatMessage(FormatBehaviorData(behaviorData))
            };

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 600,
                Temperature = 0.4f
            };

            try
            {
                var response = await _openAIService.CompleteChatAsync(
                    messages,
                    options,
                    "gpt-4o-mini",
                    cancellationToken);

                var jsonContent = ExtractJsonFromMarkdown(response);
                var insights = JsonSerializer.Deserialize<RecommendationInsights>(
                    jsonContent,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                _logger.LogInformation(
                    "[RecommendationEngine] Análise concluída - Confiança: {Score}/10",
                    insights?.ConfidenceScore ?? 0);

                return insights ?? new RecommendationInsights();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[RecommendationEngine] Erro ao analisar comportamento");
                return new RecommendationInsights();
            }
        }

        /// <summary>
        /// Explica porque uma propriedade é recomendada para o utilizador
        /// </summary>
        public async Task<string> ExplainRecommendationAsync(
            PropertySearchDto property,
            UserIntentAnalysis userIntent,
            string userPlan = "free",
            CancellationToken cancellationToken = default)
        {
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um consultor imobiliário que explica recomendações.

TAREFA: Explica de forma personalizada porque esta propriedade é ideal para o utilizador.

Foca em:
- Como alinha com as suas prioridades
- Que necessidades específicas resolve
- Vantagens que pode não ter considerado
- Potencial a longo prazo

Responde em 2-3 frases curtas e diretas.
Usa linguagem natural e amigável."),
                
                new UserChatMessage($@"Perfil do utilizador:
Motivação: {userIntent.Motivation}
Prioridades: {string.Join(", ", userIntent.Priorities)}
Estilo de vida: {userIntent.LifestylePreference}
Preocupações: {string.Join(", ", userIntent.Concerns)}

Propriedade:
{property.Type} em {property.Location}
€{property.Price:N0} | {property.Area}m² | {property.Bedrooms} quartos
Descrição: {property.Description}

Porque recomendar esta propriedade?")
            };

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 300,
                Temperature = 0.6f
            };

            try
            {
                var model = userPlan == "premium" ? "gpt-4o" : "gpt-4o-mini";
                var response = await _openAIService.CompleteChatAsync(
                    messages,
                    options,
                    model,
                    cancellationToken);

                _logger.LogInformation("[RecommendationEngine] Explicação gerada (modelo: {Model})", model);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[RecommendationEngine] Erro ao explicar recomendação");
                return "Esta propriedade corresponde aos seus critérios de pesquisa.";
            }
        }

        /// <summary>
        /// Gera perguntas inteligentes para entender melhor o utilizador
        /// </summary>
        public async Task<List<string>> GenerateSmartQuestionsAsync(
            UserIntentAnalysis userIntent,
            List<string> conversationHistory,
            string userPlan = "free",
            CancellationToken cancellationToken = default)
        {
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um consultor imobiliário experiente.

TAREFA: Gera 2-3 perguntas estratégicas para entender melhor o utilizador.

As perguntas devem:
- Descobrir necessidades ocultas
- Clarificar prioridades
- Ajudar a refinar a pesquisa
- Ser naturais e não invasivas

Responde APENAS com array JSON: [""pergunta1"", ""pergunta2"", ""pergunta3""]"),
                
                new UserChatMessage($@"Perfil atual:
Motivação: {userIntent.Motivation}
Fase de decisão: {userIntent.DecisionPhase}
Prioridades: {string.Join(", ", userIntent.Priorities)}

Histórico recente:
{string.Join("\n", conversationHistory.TakeLast(3))}

Que perguntas fazer para ajudar melhor?")
            };

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 300,
                Temperature = 0.7f // Mais criativo para perguntas
            };

            try
            {
                var model = userPlan == "premium" ? "gpt-4o" : "gpt-4o-mini";
                var response = await _openAIService.CompleteChatAsync(
                    messages,
                    options,
                    model,
                    cancellationToken);

                var jsonContent = ExtractJsonFromMarkdown(response);
                var questions = JsonSerializer.Deserialize<List<string>>(jsonContent);

                _logger.LogInformation(
                    "[RecommendationEngine] {Count} perguntas geradas (modelo: {Model})",
                    questions?.Count ?? 0,
                    model);

                return questions ?? new List<string>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[RecommendationEngine] Erro ao gerar perguntas");
                return new List<string>();
            }
        }

        private string FormatBehaviorData(UserBehaviorData data)
        {
            var searches = string.Join("\n", data.SearchHistory.Select((s, i) => 
                $"{i + 1}. {s.Query} (€{s.MinPrice}-{s.MaxPrice}, {s.Location})"));

            var viewed = string.Join("\n", data.ViewedProperties.Select((p, i) => 
                $"{i + 1}. {p.Type} em {p.Location} - €{p.Price:N0}"));

            return $@"Histórico de pesquisas (últimas {data.SearchHistory.Count}):
{searches}

Propriedades visualizadas (últimas {data.ViewedProperties.Count}):
{viewed}

Tempo na plataforma: {data.TimeOnPlatform}
Número de sessões: {data.SessionCount}
Propriedades favoritadas: {data.FavoritedCount}";
        }

        private static string ExtractJsonFromMarkdown(string response)
        {
            if (string.IsNullOrWhiteSpace(response))
                return response;

            var trimmed = response.Trim();
            if (trimmed.StartsWith("```"))
            {
                var lines = trimmed.Split('\n');
                var jsonLines = lines.Skip(1).Take(lines.Length - 2).ToArray();
                return string.Join("\n", jsonLines);
            }

            return response;
        }
    }

    #region DTOs

    public class UserBehaviorData
    {
        public List<SearchHistoryItem> SearchHistory { get; set; } = new();
        public List<PropertySearchDto> ViewedProperties { get; set; } = new();
        public TimeSpan TimeOnPlatform { get; set; }
        public int SessionCount { get; set; }
        public int FavoritedCount { get; set; }
    }

    public class SearchHistoryItem
    {
        public string Query { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public decimal MinPrice { get; set; }
        public decimal MaxPrice { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class RecommendationInsights
    {
        public List<string> SearchPatterns { get; set; } = new();
        public string Evolution { get; set; } = string.Empty;
        public List<string> ImplicitPreferences { get; set; } = new();
        public BudgetRange RealBudget { get; set; } = new();
        public List<string> WillingToCompromise { get; set; } = new();
        public List<string> NextSteps { get; set; } = new();
        public List<string> MustSeeProperties { get; set; } = new();
        public int ConfidenceScore { get; set; }
    }

    public class BudgetRange
    {
        public decimal Min { get; set; }
        public decimal Max { get; set; }
    }

    #endregion
}
