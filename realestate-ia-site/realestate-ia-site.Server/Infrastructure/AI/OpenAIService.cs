using OpenAI;
using OpenAI.Chat;
using realestate_ia_site.Server.Application.AI.Interfaces;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public class OpenAIService : IOpenAIService
    {
        private readonly OpenAIClient _client;
        private readonly string _model;
        private readonly ILogger<OpenAIService> _logger;

        public OpenAIService(IConfiguration config, ILogger<OpenAIService> logger)
        {
            _logger = logger;
            var apiKey = config["OpenAI:ApiKey"];
            _model = config["OpenAI:Model"] ?? "gpt-4o-mini";
            _client = new OpenAIClient(apiKey);
            
            _logger.LogInformation("OpenAI Service inicializado com modelo: {Model}", _model);
        }

        public async Task<string> CompleteChatAsync(List<ChatMessage> messages, ChatCompletionOptions options, CancellationToken cancellationToken = default)
        {
            _logger.LogDebug("Enviando requisição para OpenAI. Modelo: {Model}, MaxTokens: {MaxTokens}, Temperature: {Temperature}", 
                _model, options.MaxOutputTokenCount, options.Temperature);

            try
            {
                var response = await _client.GetChatClient(_model).CompleteChatAsync(messages, options, cancellationToken);
                var result = response.Value.Content[0].Text;
                
                _logger.LogDebug("Resposta recebida da OpenAI: {Response}", result);
                return result;
            }
            catch (OperationCanceledException)
            {
                _logger.LogWarning("Requisição OpenAI cancelada");
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro na comunicação com OpenAI");
                throw;
            }
        }
    }
}