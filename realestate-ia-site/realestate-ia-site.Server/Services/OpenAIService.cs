using OpenAI;
using OpenAI.Chat;
using realestate_ia_site.Server.DTOs;
using System.Text.Json;

namespace realestate_ia_site.Server.Services
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
                new SystemChatMessage(@"És um assistente inteligente especializado em imóveis em Portugal.
                                        Recebes uma lista de imóveis no formato: [ID] tipo, localização, quartos, preço, imageURL
                                        
                                        IMPORTANTE:
                                        - Se encontrares propriedades que correspondem APROXIMADAMENTE aos critérios do usuário, apresenta-as
                                        - Considera variações de localização (cidades próximas, mesmo distrito/região)
                                        - Se o usuário procura T2, considera também T3 como opção
                                        - Mostra sempre as propriedades disponíveis, mesmo que não sejam uma correspondência perfeita
                                        - Sê útil e positivo, oferece alternativas quando apropriado
                                        
                                        Responde em português de Portugal com frases naturais e amigáveis."),
                new SystemChatMessage("Imóveis disponíveis:\n" + listaImoveis),
                new UserChatMessage(perguntaOriginal)
            };

            var chatCompletionOptions = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 800,
                Temperature = 0.7f
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