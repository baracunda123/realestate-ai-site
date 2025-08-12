using OpenAI.Chat;
using realestate_ia_site.Server.DTOs;
using realestate_ia_site.Server.Infrastructure.AI.Interfaces;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public class PropertyResponseGenerator : IPropertyResponseGenerator
    {
        private readonly IOpenAIService _openAIService;
        private readonly ILogger<PropertyResponseGenerator> _logger;

        public PropertyResponseGenerator(IOpenAIService openAIService, ILogger<PropertyResponseGenerator> logger)
        {
            _openAIService = openAIService;
            _logger = logger;
        }

        public async Task<string> GenerateResponseAsync(string originalQuery, List<PropertySearchDto> properties, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("Gerando resposta para: {Question}. Propriedades: {PropertyCount}", 
                originalQuery, properties.Count);

            var propertiesList = FormatPropertiesForAI(properties);

            var messages = new List<ChatMessage>
            {
                new SystemChatMessage(GetChatbotPrompt()),
                new SystemChatMessage($"Imóveis disponíveis (lista fechada):\n{propertiesList}"),
                new UserChatMessage(originalQuery)
            };

            var options = new ChatCompletionOptions
            {
                MaxOutputTokenCount = 800,
                Temperature = 0.3f
            };

            try
            {
                var response = await _openAIService.CompleteChatAsync(messages, options, cancellationToken);
                
                _logger.LogInformation("Resposta gerada com sucesso. Tamanho: {ResponseLength} caracteres", response.Length);
                _logger.LogDebug("Resposta: {Response}", response);
                
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao gerar resposta. Pergunta: {Question}, Propriedades: {PropertyCount}", 
                    originalQuery, properties.Count);
                return "Desculpa, ocorreu um erro ao processar o teu pedido. Tenta novamente.";
            }
        }

        private static string FormatPropertiesForAI(List<PropertySearchDto> properties)
        {
            return string.Join("\n", properties.Select(p =>
                $"[{p.Id}] {p.Type} em {p.Location}, {p.Bedrooms} quartos, € {p.Price:N0}, imageURL:{p.ImageUrl}"));
        }

        private static string GetChatbotPrompt()
        {
            return @"És um assistente imobiliário em Portugal.

                    REGRAS OBRIGATÓRIAS (CUMPRE SEMPRE):
                    1) LISTA FECHADA: Só podes apresentar imóveis que constam na lista fornecida.
                    2) TIPOLOGIA: Se o utilizador procurar T2, considera também T3 como opção, apresentando primeiro todos os T2 (se existirem) e depois todos os T3 como ""resultados semelhantes"".
                    3) PROIBIÇÕES: Nunca inventes, alteres ou adiciones dados (IDs, preços, localizações, tipos, quartos).
                    4) CÓPIA EXATA: Copia os campos exatamente como estão na lista (mesma ortografia e valores).
                    5) ARREDORES: Só podes mostrar 'arredores' se esses imóveis já estiverem na lista fornecida. Nunca cries arredores.
                    6) DÚVIDA → EXCLUIR: Se não tens certeza que um imóvel está na lista, não o apresentes.
                    7) LISTA VAZIA:
                       - Se não houver resultados na localização principal, mas houver imóveis nos arredores, apresenta todos os arredores encontrados, identificando-os claramente.
                       - Só responde que não existem imóveis quando não existir nenhum imóvel, nem principal nem arredores, e a lista fornecida estiver vazia.
                    8) FORMATO: Responde em português de forma natural, como se estivesses a falar com um cliente, mas usando apenas os dados da lista fornecida.
                    9) QUANTIDADE: Sempre que apresentares resultados, lista todos os imóveis encontrados que correspondam aos critérios ajustados, sem limite de quantidade.

                    Tens de ser claro, mas natural, descrevendo os imóveis encontrados como um agente imobiliário humano faria.";
        }
    }
}