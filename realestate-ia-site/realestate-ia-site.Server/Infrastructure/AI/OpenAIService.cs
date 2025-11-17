using OpenAI;
using OpenAI.Chat;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public class OpenAIService : IOpenAIService
    {
        private readonly OpenAIClient _client;
        private readonly string _defaultModel;
        private readonly ILogger<OpenAIService> _logger;

        // Mapeamento de planos para modelos GPT
        private readonly Dictionary<string, string> _planToModel = new()
        {
            ["free"] = "gpt-4o-mini",       // Plano Free (anónimo ou sem subscrição) usa mini
            ["premium"] = "gpt-4o"          // Plano Premium (pago) usa GPT-4o
        };

        public OpenAIService(IConfiguration config, ILogger<OpenAIService> logger)
        {
            _logger = logger;
            var apiKey = config["OpenAI:ApiKey"];
            _defaultModel = config["OpenAI:Model"] ?? "gpt-4o-mini";
            _client = new OpenAIClient(apiKey);

            _logger.LogInformation("OpenAI Service inicializado com modelo padrão: {Model}", _defaultModel);
        }

        public async Task<string> CompleteChatAsync(List<ChatMessage> messages, ChatCompletionOptions options, CancellationToken cancellationToken = default)
        {
            return await CompleteChatAsync(messages, options, _defaultModel, cancellationToken);
        }

        public async Task<string> CompleteChatAsync(List<ChatMessage> messages, ChatCompletionOptions options, string modelOverride, CancellationToken cancellationToken = default)
        {
            var model = string.IsNullOrWhiteSpace(modelOverride) ? _defaultModel : modelOverride;

            _logger.LogDebug("Enviando requisição para OpenAI. Modelo: {Model}, MaxTokens: {MaxTokens}, Temperature: {Temperature}",
                model, options.MaxOutputTokenCount, options.Temperature);

            try
            {
                var response = await _client.GetChatClient(model).CompleteChatAsync(messages, options, cancellationToken);
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

        public string GetModelForPlan(string planType)
        {
            if (string.IsNullOrWhiteSpace(planType))
            {
                _logger.LogWarning("PlanType vazio, usando modelo padrão: {Model}", _defaultModel);
                return _defaultModel;
            }

            var normalizedPlan = planType.ToLower().Trim();

            if (_planToModel.TryGetValue(normalizedPlan, out var model))
            {
                _logger.LogInformation("Modelo selecionado para plano '{Plan}': {Model}", planType, model);
                return model;
            }

            _logger.LogWarning("Plano desconhecido '{Plan}', usando modelo padrão: {Model}", planType, _defaultModel);
            return _defaultModel;
        }
    }
}
