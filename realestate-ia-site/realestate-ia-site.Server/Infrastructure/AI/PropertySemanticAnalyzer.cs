using OpenAI.Chat;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using System.Text.Json;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    /// <summary>
    /// Análise semântica profunda de descrições de propriedades.
    /// Extrai insights, sentimentos, pontos fortes/fracos, e contexto detalhado.
    /// </summary>
    public class PropertySemanticAnalyzer : IPropertySemanticAnalyzer
    {
        private readonly IOpenAIService _openAIService;
        private readonly ILogger<PropertySemanticAnalyzer> _logger;

        public PropertySemanticAnalyzer(
            IOpenAIService openAIService,
            ILogger<PropertySemanticAnalyzer> logger)
        {
            _openAIService = openAIService;
            _logger = logger;
        }

        /// <summary>
        /// Analisa profundamente uma descrição e extrai insights estruturados
        /// </summary>
        public async Task<PropertySemanticInsights> AnalyzeDescriptionAsync(
            string description,
            string propertyType,
            string location,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(description))
                return new PropertySemanticInsights();

            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um especialista em análise de anúncios imobiliários em Portugal.

TAREFA: Analisa a descrição do imóvel e extrai insights profundos.

Analisa os seguintes aspectos:
1. PONTOS FORTES: O que torna este imóvel atrativo? (máx 5 pontos)
2. PONTOS FRACOS: O que pode ser negativo ou está em falta? (máx 3 pontos)
3. PÚBLICO-ALVO: Para quem é ideal este imóvel? (famílias, jovens, investidores, etc.)
4. SENTIMENTO: Qual o tom da descrição? (profissional, entusiasta, neutro, urgente)
5. DESTAQUES ÚNICOS: O que diferencia este imóvel dos outros?
6. ESTADO PERCEBIDO: Novo, renovado, bom estado, a necessitar obras, não mencionado
7. URGÊNCIA: Há sinais de urgência na venda? (sim/não)
8. INVESTIMENTO: É adequado para investimento? (sim/não/talvez)
9. KEYWORDS: 5-10 palavras-chave que descrevem o imóvel
10. SCORE_QUALIDADE_DESCRICAO: 0-10 (quão bem escrita e informativa é a descrição)

Responde APENAS com JSON:
{
  ""strongPoints"": [""ponto1"", ""ponto2"", ...],
  ""weakPoints"": [""ponto1"", ...],
  ""targetAudience"": [""público1"", ""público2"", ...],
  ""sentiment"": ""profissional"",
  ""uniqueHighlights"": [""destaque1"", ...],
  ""perceivedCondition"": ""renovado"",
  ""urgency"": false,
  ""investmentSuitable"": true,
  ""keywords"": [""keyword1"", ""keyword2"", ...],
  ""descriptionQualityScore"": 8
}"),
                
                new UserChatMessage($@"Tipo: {propertyType}
Localização: {location}

Descrição:
{description}")
            };

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 800,
                Temperature = 0.3f // Baixa mas permite alguma interpretação
            };

            try
            {
                var response = await _openAIService.CompleteChatAsync(
                    messages,
                    options,
                    "gpt-4o-mini",
                    cancellationToken);

                var jsonContent = ExtractJsonFromMarkdown(response);
                var insights = JsonSerializer.Deserialize<PropertySemanticInsights>(
                    jsonContent,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                _logger.LogInformation(
                    "[SemanticAnalyzer] Análise concluída - Qualidade: {Score}/10, Público: {Audience}",
                    insights?.DescriptionQualityScore ?? 0,
                    string.Join(", ", insights?.TargetAudience ?? new List<string>()));

                return insights ?? new PropertySemanticInsights();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SemanticAnalyzer] Erro ao analisar descrição");
                return new PropertySemanticInsights();
            }
        }

        /// <summary>
        /// Compara duas propriedades e explica qual é melhor para o utilizador
        /// </summary>
        public async Task<string> ComparePropertiesAsync(
            PropertyComparisonRequest request,
            string userPlan = "free",
            CancellationToken cancellationToken = default)
        {
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um consultor imobiliário experiente em Portugal.

TAREFA: Compara duas propriedades e explica qual é melhor para o utilizador.

Considera:
- Relação qualidade/preço
- Adequação às necessidades do utilizador
- Localização e acessibilidades
- Estado e características
- Potencial de valorização

Responde em 2-3 parágrafos curtos, sendo direto e objetivo.
Usa linguagem natural e amigável."),
                
                new UserChatMessage($@"Necessidades do utilizador: {request.UserNeeds}

PROPRIEDADE A:
Tipo: {request.PropertyA.Type}
Localização: {request.PropertyA.Location}
Preço: €{request.PropertyA.Price:N0}
Área: {request.PropertyA.Area}m²
Quartos: {request.PropertyA.Bedrooms}
Descrição: {request.PropertyA.Description}

PROPRIEDADE B:
Tipo: {request.PropertyB.Type}
Localização: {request.PropertyB.Location}
Preço: €{request.PropertyB.Price:N0}
Área: {request.PropertyB.Area}m²
Quartos: {request.PropertyB.Bedrooms}
Descrição: {request.PropertyB.Description}

Qual recomendas e porquê?")
            };

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 500,
                Temperature = 0.6f // Mais criativo para comparações
            };

            try
            {
                var model = userPlan == "premium" ? "gpt-4o" : "gpt-4o-mini";
                var response = await _openAIService.CompleteChatAsync(
                    messages,
                    options,
                    model,
                    cancellationToken);

                _logger.LogInformation("[SemanticAnalyzer] Comparação gerada com sucesso (modelo: {Model})", model);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SemanticAnalyzer] Erro ao comparar propriedades");
                return "Não foi possível comparar as propriedades neste momento.";
            }
        }

        /// <summary>
        /// Interpreta a intenção profunda do utilizador além dos filtros básicos
        /// </summary>
        public async Task<UserIntentAnalysis> AnalyzeUserIntentAsync(
            string userQuery,
            IEnumerable<ChatMessage> conversationHistory,
            string userPlan = "free",
            CancellationToken cancellationToken = default)
        {
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um especialista em compreender necessidades imobiliárias.

TAREFA: Analisa o histórico da conversa e a pergunta atual do utilizador para identificar a INTENÇÃO PROFUNDA.

Identifica:
1. MOTIVAÇÃO: Porque está a procurar? (mudança de vida, investimento, primeira casa, upgrade, etc.)
2. URGÊNCIA_TEMPORAL: Quando precisa? (urgente, alguns meses, só a explorar)
3. PRIORIDADES: O que é mais importante? (preço, localização, espaço, estado, etc.) - ordenadas
4. FLEXIBILIDADE: Quão flexível é? (muito rígido, alguma flexibilidade, muito flexível)
5. ESTILO_VIDA: Que estilo de vida procura? (urbano, familiar, tranquilo, dinâmico, etc.)
6. PREOCUPAÇÕES: O que o preocupa? (segurança, transportes, escolas, barulho, etc.)
7. FASE_DECISAO: Em que fase está? (pesquisa inicial, comparação ativa, pronto para decidir)
8. NECESSIDADES_OCULTAS: O que não disse mas pode ser importante?

Responde APENAS com JSON:
{
  ""motivation"": ""primeira_casa"",
  ""timeUrgency"": ""alguns_meses"",
  ""priorities"": [""localização"", ""preço"", ""espaço""],
  ""flexibility"": ""alguma_flexibilidade"",
  ""lifestylePreference"": ""familiar"",
  ""concerns"": [""escolas"", ""transportes""],
  ""decisionPhase"": ""comparacao_ativa"",
  ""hiddenNeeds"": [""espaço exterior"", ""estacionamento""]
}")
            };
            
            // Adicionar histórico de conversa como mensagens separadas (melhor contexto para a IA)
            messages.AddRange(conversationHistory);
            
            // Adicionar a query atual
            messages.Add(new UserChatMessage($"[QUERY ATUAL A ANALISAR]: {userQuery}"));

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 400,
                Temperature = 0.4f
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
                var intent = JsonSerializer.Deserialize<UserIntentAnalysis>(
                    jsonContent,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                _logger.LogInformation(
                    "[SemanticAnalyzer] Intenção identificada (modelo: {Model}) - Motivação: {Motivation}, Fase: {Phase}",
                    model,
                    intent?.Motivation ?? "desconhecida",
                    intent?.DecisionPhase ?? "desconhecida");

                return intent ?? new UserIntentAnalysis();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SemanticAnalyzer] Erro ao analisar intenção");
                return new UserIntentAnalysis();
            }
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

    public class PropertySemanticInsights
    {
        public List<string> StrongPoints { get; set; } = new();
        public List<string> WeakPoints { get; set; } = new();
        public List<string> TargetAudience { get; set; } = new();
        public string Sentiment { get; set; } = "neutro";
        public List<string> UniqueHighlights { get; set; } = new();
        public string PerceivedCondition { get; set; } = "não mencionado";
        public bool Urgency { get; set; }
        public bool InvestmentSuitable { get; set; }
        public List<string> Keywords { get; set; } = new();
        public int DescriptionQualityScore { get; set; }
    }

    public class PropertyComparisonRequest
    {
        public string UserNeeds { get; set; } = string.Empty;
        public PropertyComparisonData PropertyA { get; set; } = new();
        public PropertyComparisonData PropertyB { get; set; } = new();
    }

    public class PropertyComparisonData
    {
        public string Type { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal Area { get; set; }
        public int Bedrooms { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    public class UserIntentAnalysis
    {
        public string Motivation { get; set; } = "desconhecida";
        public string TimeUrgency { get; set; } = "explorar";
        public List<string> Priorities { get; set; } = new();
        public string Flexibility { get; set; } = "alguma_flexibilidade";
        public string LifestylePreference { get; set; } = "não identificado";
        public List<string> Concerns { get; set; } = new();
        public string DecisionPhase { get; set; } = "pesquisa_inicial";
        public List<string> HiddenNeeds { get; set; } = new();
    }

    #endregion
}
