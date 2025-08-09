using OpenAI;
using OpenAI.Chat;
using realestate_ia_site.Server.DTOs;
using System.Text.Json;

namespace realestate_ia_site.Server.Services.AIServices
{
    public class OpenAIService
    {
        private readonly OpenAIClient _client;
        private readonly string _modelo;
        private readonly ILogger<OpenAIService> _logger;

        public OpenAIService(IConfiguration config, ILogger<OpenAIService> logger)
        {
            _logger = logger;
            var apiKey = config["OpenAI:ApiKey"];
            _modelo = config["OpenAI:Model"] ?? "gpt-3.5-turbo";
            _client = new OpenAIClient(apiKey);
            
            _logger.LogInformation("OpenAIService inicializado com modelo: {Model}", _modelo);
        }

        /// <summary>
        /// Extrai filtros da frase do utilizador em formato JSON
        /// </summary>
        public async Task<Dictionary<string, object>> InterpretTextAsync(string input)
        {
            _logger.LogInformation("Iniciando interpretação de texto: {Input}", input);
            
            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(@"Extrai filtros de imóveis a partir da frase do usuário.
                                        Retorna um JSON com os campos possíveis:    
                                        - type (string)
                                        - location (string)
                                        - max_price (número)
                                        - rooms (número)
                                        - tags (lista de palavras, como 'piscina', 'varanda').
                                        Exemplo de resposta:
                                        {
                                          ""type"": ""Apartamento"",
                                          ""location"": ""Lisboa"",
                                          ""rooms"": 3,
                                          ""max_price"": 5000000,
                                          ""tags"": [""varanda"", ""moderno""]
                                        }"),
                new UserChatMessage(input)
            };

            var chatCompletionOptions = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 500,
                Temperature = 0.3f
            };

            _logger.LogDebug("Enviando requisição para OpenAI. Modelo: {Model}, MaxTokens: {MaxTokens}, Temperature: {Temperature}", 
                _modelo, chatCompletionOptions.MaxOutputTokenCount, chatCompletionOptions.Temperature);

            try
            {
                var response = await _client.GetChatClient(_modelo).CompleteChatAsync(messages, chatCompletionOptions);
                var jsonResponse = response.Value.Content[0].Text;
                
                _logger.LogDebug("Resposta recebida da OpenAI: {Response}", jsonResponse);

                var filtros = JsonSerializer.Deserialize<Dictionary<string, object>>(jsonResponse);
                var filterCount = filtros?.Count ?? 0;
                
                _logger.LogInformation("Interpretação concluída com sucesso. Filtros extraídos: {FilterCount}", filterCount);
                _logger.LogDebug("🔍 Filtros detalhados: {@Filters}", filtros);
                
                return filtros ?? new Dictionary<string, object>();
            }
            catch (JsonException jsonEx)
            {
                _logger.LogError(jsonEx, "Erro ao deserializar resposta JSON da OpenAI. Input: {Input}", input);
                return new Dictionary<string, object>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao interpretar texto com OpenAI. Input: {Input}", input);
                return new Dictionary<string, object>();
            }
        }

        /// <summary>
        /// Gera uma resposta textual natural com base nos imóveis encontrados
        /// </summary>
        public async Task<string> ResponderComoChatbotAsync(string perguntaOriginal, List<PropertySearchDto> properties)
        {
            _logger.LogInformation("Gerando resposta do chatbot para: {Question}. Propriedades disponíveis: {PropertyCount}", 
                perguntaOriginal, properties.Count);

            string listaImoveis = string.Join("\n", properties.Select(i =>
                $"[{i.Id}] {i.Type} em {i.Location}, {i.Bedrooms} quartos, € {i.Price:N0}, imageURL:{i.ImageUrl} "
            ));

            _logger.LogInformation("Lista de imóveis formatada para OpenAI: {PropertyList}", listaImoveis);

            var messages = new List<ChatMessage>
            {
               new SystemChatMessage(@"És um assistente imobiliário em Portugal.

                                        REGRAS OBRIGATÓRIAS (CUMPRE SEMPRE):
                                        1) LISTA FECHADA: Só podes apresentar imóveis que constam na lista fornecida.
                                        2) TIPOLOGIA: Se o utilizador procurar T2, considera também T3 como opção, apresentando primeiro todos os T2 (se existirem) e depois todos os T3 como “resultados semelhantes”.
                                        3) PROIBIÇÕES: Nunca inventes, alteres ou adiciones dados (IDs, preços, localizações, tipos, quartos).
                                        4) CÓPIA EXATA: Copia os campos exatamente como estão na lista (mesma ortografia e valores).
                                        5) ARREDORES: Só podes mostrar 'arredores' se esses imóveis já estiverem na lista fornecida. Nunca cries arredores.
                                        6) DÚVIDA → EXCLUIR: Se não tens certeza que um imóvel está na lista, não o apresentes.
                                        7) LISTA VAZIA:
                                           - Se não houver resultados na localização principal, mas houver imóveis nos arredores, apresenta todos os arredores encontrados, identificando-os claramente.
                                           - Só responde que não existem imóveis quando não existir nenhum imóvel, nem principal nem arredores, e a lista fornecida estiver vazia.
                                        8) FORMATO: Responde em português de forma natural, como se estivesses a falar com um cliente, mas usando apenas os dados da lista fornecida.
                                        9) QUANTIDADE: Sempre que apresentares resultados, lista todos os imóveis encontrados que correspondam aos critérios ajustados, sem limite de quantidade.

                                        Tens de ser claro, mas natural, descrevendo os imóveis encontrados como um agente imobiliário humano faria.

                                        "),
                new SystemChatMessage($"Imóveis disponíveis (lista fechada) :\n{listaImoveis}"),
                new UserChatMessage(perguntaOriginal)
            };


            var chatCompletionOptions = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 800,
                Temperature = 0.3f // Reduzir temperatura para respostas mais precisas
            };

            _logger.LogDebug("Enviando requisição de resposta para OpenAI. MaxTokens: {MaxTokens}, Temperature: {Temperature}", 
                chatCompletionOptions.MaxOutputTokenCount, chatCompletionOptions.Temperature);

            try
            {
                var response = await _client.GetChatClient(_modelo).CompleteChatAsync(messages, chatCompletionOptions);
                var chatbotResponse = response.Value.Content[0].Text;
                
                _logger.LogInformation("Resposta do chatbot gerada com sucesso. Tamanho: {ResponseLength} caracteres", chatbotResponse.Length);
                _logger.LogDebug("Resposta do chatbot: {Response}", chatbotResponse);
                
                return chatbotResponse;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao gerar resposta do chatbot. Pergunta: {Question}, Propriedades: {PropertyCount}", 
                    perguntaOriginal, properties.Count);
                return "Desculpa, ocorreu um erro ao processar o teu pedido. Tenta novamente.";
            }
        }

        /// <summary>
        /// Método adicional para conversas contínuas (opcional)
        /// </summary>
        public async Task<string> ContinuarConversaAsync(List<ChatMessage> historicoConversa, string novaMensagem)
        {
            _logger.LogInformation("Continuando conversa. Histórico: {HistoryCount} mensagens, Nova mensagem: {NewMessage}", 
                historicoConversa.Count, novaMensagem);

            var messages = new List<ChatMessage>(historicoConversa)
            {
                new UserChatMessage(novaMensagem)
            };

            var chatCompletionOptions = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 500,
                Temperature = 0.7f
            };

            _logger.LogDebug("Enviando conversa contínua para OpenAI. Total mensagens: {MessageCount}", messages.Count);

            try
            {
                var response = await _client.GetChatClient(_modelo).CompleteChatAsync(messages, chatCompletionOptions);
                var conversationResponse = response.Value.Content[0].Text;
                
                _logger.LogInformation("Conversa contínua processada com sucesso. Resposta: {ResponseLength} caracteres", 
                    conversationResponse.Length);
                _logger.LogDebug("Resposta da conversa: {Response}", conversationResponse);
                
                return conversationResponse;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro na conversa contínua. Nova mensagem: {NewMessage}, Histórico: {HistoryCount}", 
                    novaMensagem, historicoConversa.Count);
                return "Desculpa, ocorreu um erro. Podes repetir?";
            }
        }
    }
}