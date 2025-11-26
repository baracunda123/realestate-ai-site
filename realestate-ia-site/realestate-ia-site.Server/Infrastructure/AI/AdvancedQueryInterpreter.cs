using OpenAI.Chat;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;
using realestate_ia_site.Server.Application.Common.Context;
using System.Text.Json;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    /// <summary>
    /// Interpretador avançado que entende contexto, nuances e linguagem natural complexa
    /// </summary>
    public class AdvancedQueryInterpreter : IAdvancedQueryInterpreter
    {
        private readonly IOpenAIService _openAIService;
        private readonly UserRequestContext _userContext;
        private readonly ILogger<AdvancedQueryInterpreter> _logger;

        public AdvancedQueryInterpreter(
            IOpenAIService openAIService,
            UserRequestContext userContext,
            ILogger<AdvancedQueryInterpreter> logger)
        {
            _openAIService = openAIService;
            _userContext = userContext;
            _logger = logger;
        }

        /// <summary>
        /// Interpreta queries complexas com múltiplas condições e nuances
        /// </summary>
        public async Task<ComplexQueryInterpretation> InterpretComplexQueryAsync(
            string userQuery,
            IEnumerable<ChatMessage> conversationHistory,
            CancellationToken cancellationToken = default)
        {
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um especialista em compreender pedidos imobiliários complexos.

TAREFA: Analisa o histórico da conversa e interpreta a query atual do utilizador identificando TODAS as nuances e condições.

Identifica:
1. REQUISITOS_OBRIGATÓRIOS: O que é absolutamente necessário
2. PREFERÊNCIAS: O que seria bom ter mas não é obrigatório
3. DEALBREAKERS: O que definitivamente NÃO quer
4. CONDIÇÕES_CONTEXTUAIS: Condições que dependem de outras (ex: ""se for longe do centro, tem que ter garagem"")
5. PRIORIDADE_RELATIVA: Qual a ordem de importância dos critérios
6. TRADE_OFFS_ACEITÁVEIS: O que está disposto a trocar (ex: ""menos área se for melhor localização"")
7. AMBIGUIDADES: O que não está claro e precisa clarificação
8. EMOÇÕES: Que emoções/sentimentos estão presentes (ansiedade, entusiasmo, frustração, etc.)

Responde APENAS com JSON:
{
  ""mandatoryRequirements"": [""req1"", ""req2""],
  ""preferences"": [""pref1"", ""pref2""],
  ""dealbreakers"": [""deal1"", ""deal2""],
  ""contextualConditions"": [
    {""condition"": ""se X"", ""then"": ""então Y""}
  ],
  ""priorityOrder"": [""critério1"", ""critério2"", ""critério3""],
  ""acceptableTradeoffs"": [
    {""sacrifice"": ""área"", ""for"": ""localização""}
  ],
  ""ambiguities"": [""ambiguidade1""],
  ""emotions"": [""emoção1""],
  ""interpretationConfidence"": 8
}")
            };
            
            // Adicionar histórico de conversa como mensagens separadas (melhor contexto para a IA)
            messages.AddRange(conversationHistory);
            
            // Adicionar a query atual
            messages.Add(new UserChatMessage($"[QUERY ATUAL A INTERPRETAR]: {userQuery}"));

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 700,
                Temperature = 0.3f
            };

            try
            {
                var response = await _openAIService.CompleteChatAsync(
                    messages,
                    options,
                    "gpt-4o",  // Usar GPT-4o para interpretação complexa
                    cancellationToken);

                var jsonContent = ExtractJsonFromMarkdown(response);
                var interpretation = JsonSerializer.Deserialize<ComplexQueryInterpretation>(
                    jsonContent,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                _logger.LogInformation(
                    "[AdvancedInterpreter] Query interpretada - Confiança: {Confidence}/10, Ambiguidades: {Count}",
                    interpretation?.InterpretationConfidence ?? 0,
                    interpretation?.Ambiguities?.Count ?? 0);

                return interpretation ?? new ComplexQueryInterpretation();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AdvancedInterpreter] Erro ao interpretar query complexa");
                return new ComplexQueryInterpretation();
            }
        }

        /// <summary>
        /// Detecta mudanças de intenção durante a conversa
        /// </summary>
        public async Task<IntentChangeDetection> DetectIntentChangeAsync(
            string previousQuery,
            string currentQuery,
            CancellationToken cancellationToken = default)
        {
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um especialista em análise de conversação.

TAREFA: Detecta se o utilizador mudou de intenção ou está a refinar a mesma pesquisa.

Identifica:
1. TIPO_MUDANÇA: refinamento, mudança_parcial, mudança_completa, contradição
2. O_QUE_MUDOU: Que aspectos mudaram especificamente
3. O_QUE_MANTEVE: O que continua igual
4. RAZÃO_PROVÁVEL: Porque mudou (insatisfação, nova prioridade, exploração, etc.)
5. AÇÃO_RECOMENDADA: Como o sistema deve reagir

Responde APENAS com JSON:
{
  ""changeType"": ""refinamento"",
  ""whatChanged"": [""aspecto1"", ""aspecto2""],
  ""whatRemained"": [""aspecto1""],
  ""likelyReason"": ""insatisfação com resultados"",
  ""recommendedAction"": ""manter contexto e adicionar novos filtros"",
  ""confidence"": 9
}"),
                
                new UserChatMessage($@"Query anterior:
{previousQuery}

Query atual:
{currentQuery}

Houve mudança de intenção?")
            };

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 400,
                Temperature = 0.2f
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
                var detection = JsonSerializer.Deserialize<IntentChangeDetection>(
                    jsonContent,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                _logger.LogDebug(
                    "[AdvancedInterpreter] Mudança: {Type}",
                    detection?.ChangeType ?? "desconhecido");

                return detection ?? new IntentChangeDetection();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AdvancedInterpreter] Erro ao detectar mudança de intenção");
                return new IntentChangeDetection();
            }
        }

        /// <summary>
        /// Expande queries vagas em critérios específicos
        /// </summary>
        public async Task<List<string>> ExpandVagueQueryAsync(
            string vagueQuery,
            CancellationToken cancellationToken = default)
        {
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um especialista em transformar pedidos vagos em critérios específicos.

TAREFA: Expande a query vaga em critérios concretos que podemos pesquisar.

Exemplo:
Input: ""Quero algo bom para família""
Output: [""3+ quartos"", ""zona com escolas"", ""espaço exterior ou varanda"", ""zona segura"", ""perto de parques"", ""boa acessibilidade""]

Responde APENAS com array JSON de critérios específicos."),
                
                new UserChatMessage(vagueQuery)
            };

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 300,
                Temperature = 0.5f
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
                var criteria = JsonSerializer.Deserialize<List<string>>(jsonContent);

                _logger.LogDebug(
                    "[AdvancedInterpreter] Query expandida: {Count} critérios",
                    criteria?.Count ?? 0);

                return criteria ?? new List<string>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AdvancedInterpreter] Erro ao expandir query vaga");
                return new List<string>();
            }
        }

        /// <summary>
        /// Sugere refinamentos inteligentes baseados nos resultados
        /// </summary>
        public async Task<List<string>> SuggestRefinementsAsync(
            string originalQuery,
            int resultsCount,
            List<string> resultsSummary,
            CancellationToken cancellationToken = default)
        {
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"És um consultor imobiliário que sugere refinamentos de pesquisa.

TAREFA: Baseado na query original e nos resultados, sugere 3-4 refinamentos úteis.

Os refinamentos devem:
- Ser específicos e acionáveis
- Ajudar a encontrar exatamente o que procura
- Ser apresentados como perguntas ou sugestões naturais

Exemplo: ""Queres ver apenas opções com varanda?"", ""E se considerares também Matosinhos?""

Responde APENAS com array JSON de sugestões."),
                
                new UserChatMessage($@"Query original: {originalQuery}
Resultados encontrados: {resultsCount}
Resumo: {string.Join(", ", resultsSummary)}

Que refinamentos sugerir?")
            };

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 300,
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

                var jsonContent = ExtractJsonFromMarkdown(response);
                var suggestions = JsonSerializer.Deserialize<List<string>>(jsonContent);

                _logger.LogDebug(
                    "[AdvancedInterpreter] {Count} refinamentos sugeridos",
                    suggestions?.Count ?? 0);

                return suggestions ?? new List<string>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[AdvancedInterpreter] Erro ao sugerir refinamentos");
                return new List<string>();
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

    public class ComplexQueryInterpretation
    {
        public List<string> MandatoryRequirements { get; set; } = new();
        public List<string> Preferences { get; set; } = new();
        public List<string> Dealbreakers { get; set; } = new();
        public List<ContextualCondition> ContextualConditions { get; set; } = new();
        public List<string> PriorityOrder { get; set; } = new();
        public List<TradeOff> AcceptableTradeoffs { get; set; } = new();
        public List<string> Ambiguities { get; set; } = new();
        public List<string> Emotions { get; set; } = new();
        public int InterpretationConfidence { get; set; }
    }

    public class ContextualCondition
    {
        public string Condition { get; set; } = string.Empty;
        public string Then { get; set; } = string.Empty;
    }

    public class TradeOff
    {
        public string Sacrifice { get; set; } = string.Empty;
        public string For { get; set; } = string.Empty;
    }

    public class IntentChangeDetection
    {
        public string ChangeType { get; set; } = "refinamento";
        public List<string> WhatChanged { get; set; } = new();
        public List<string> WhatRemained { get; set; } = new();
        public string LikelyReason { get; set; } = string.Empty;
        public string RecommendedAction { get; set; } = string.Empty;
        public int Confidence { get; set; }
    }

    #endregion
}
