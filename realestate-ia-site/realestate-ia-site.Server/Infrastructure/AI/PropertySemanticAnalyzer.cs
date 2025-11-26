using OpenAI.Chat;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using realestate_ia_site.Server.Application.Common.Context;
using System.Text.Json;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    /// <summary>
    /// Analisador semântico para interpretar intenções do utilizador.
    /// </summary>
    public class PropertySemanticAnalyzer : IPropertySemanticAnalyzer
    {
        private readonly IOpenAIService _openAIService;
        private readonly UserRequestContext _userContext;
        private readonly ILogger<PropertySemanticAnalyzer> _logger;

        public PropertySemanticAnalyzer(
            IOpenAIService openAIService,
            UserRequestContext userContext,
            ILogger<PropertySemanticAnalyzer> logger)
        {
            _openAIService = openAIService;
            _userContext = userContext;
            _logger = logger;
        }

        /// <summary>
        /// Interpreta a intenção profunda do utilizador além dos filtros básicos
        /// </summary>
        public async Task<UserIntentAnalysis> AnalyzeUserIntentAsync(
            string userQuery,
            IEnumerable<ChatMessage> conversationHistory,
            CancellationToken cancellationToken = default)
        {
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um especialista em compreender necessidades imobiliárias.

TAREFA: Analisa APENAS a query atual do utilizador para identificar a INTENÇÃO.

REGRA CRÍTICA: Só identifica o que está EXPLÍCITO ou CLARAMENTE IMPLÍCITO na query.
NÃO INVENTES necessidades que não foram mencionadas.
Se a query é simples (ex: ""até 240k""), retorna campos vazios ou ""desconhecida"".

Identifica:
1. MOTIVAÇÃO: Porque está a procurar? (mudança de vida, investimento, primeira casa, upgrade, desconhecida)
2. URGÊNCIA_TEMPORAL: Quando precisa? (urgente, alguns meses, só a explorar, desconhecida)
3. PRIORIDADES: O que é mais importante? - SÓ se mencionado explicitamente
4. FLEXIBILIDADE: Quão flexível é? (muito rígido, alguma flexibilidade, muito flexível, desconhecida)
5. ESTILO_VIDA: Que estilo de vida procura? - SÓ se mencionado explicitamente
6. PREOCUPAÇÕES: O que o preocupa? - SÓ se mencionado explicitamente
7. FASE_DECISAO: Em que fase está? (pesquisa inicial, comparação ativa, pronto para decidir, desconhecida)
8. NECESSIDADES_OCULTAS: DEIXAR VAZIO a menos que seja MUITO ÓBVIO

Responde APENAS com JSON:
{
  ""motivation"": ""desconhecida"",
  ""timeUrgency"": ""desconhecida"",
  ""priorities"": [],
  ""flexibility"": ""desconhecida"",
  ""lifestylePreference"": ""não identificado"",
  ""concerns"": [],
  ""decisionPhase"": ""desconhecida"",
  ""hiddenNeeds"": []
}")
            };
            
            // NÃO adicionar histórico - analisar apenas a query atual
            // O histórico contamina a análise com contexto de mensagens anteriores
            
            // Adicionar apenas a query atual
            messages.Add(new UserChatMessage(userQuery));

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 400,
                Temperature = 0.4f
            };

            try
            {
                var model = _userContext.IsPremium ? "gpt-4o" : "gpt-4o-mini";
                var response = await _openAIService.CompleteChatAsync(
                    messages,
                    options,
                    model,
                    cancellationToken);

                var jsonContent = ExtractJsonFromMarkdown(response);
                var intent = JsonSerializer.Deserialize<UserIntentAnalysis>(
                    jsonContent,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                _logger.LogDebug(
                    "[SemanticAnalyzer] Intenção: {Motivation}, Fase: {Phase}",
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

        /// <summary>
        /// Compara duas propriedades e explica qual é melhor para o utilizador
        /// </summary>
        public async Task<string> ComparePropertiesAsync(
            PropertyComparisonRequest request,
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
                Temperature = 0.6f
            };

            try
            {
                var model = _userContext.IsPremium ? "gpt-4o" : "gpt-4o-mini";
                var response = await _openAIService.CompleteChatAsync(
                    messages,
                    options,
                    model,
                    cancellationToken);

                _logger.LogDebug("[SemanticAnalyzer] Comparação gerada");
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[SemanticAnalyzer] Erro ao comparar propriedades");
                return "Não foi possível comparar as propriedades neste momento.";
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

    /// <summary>
    /// Resultado da análise de intenção do utilizador.
    /// </summary>
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

    /// <summary>
    /// Request para comparação de propriedades.
    /// </summary>
    public class PropertyComparisonRequest
    {
        public string UserNeeds { get; set; } = string.Empty;
        public PropertyComparisonData PropertyA { get; set; } = new();
        public PropertyComparisonData PropertyB { get; set; } = new();
    }

    /// <summary>
    /// Dados de uma propriedade para comparação.
    /// </summary>
    public class PropertyComparisonData
    {
        public string Type { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public decimal Area { get; set; }
        public int Bedrooms { get; set; }
        public string Description { get; set; } = string.Empty;
    }
}
