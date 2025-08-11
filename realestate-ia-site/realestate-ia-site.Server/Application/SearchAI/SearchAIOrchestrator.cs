using realestate_ia_site.Server.DTOs.SearchAI;
using realestate_ia_site.Server.Infrastructure.AI;
using realestate_ia_site.Server.Infrastructure.RealEstate;

namespace realestate_ia_site.Server.Application.SearchAI
{
    public sealed class SearchAIOrchestrator 
    {
        private readonly OpenAIClient _openAI;
        private readonly PropertyAISearchHandler _propertyAI;
        private readonly ILogger<SearchAIOrchestrator> _logger;

        public SearchAIOrchestrator(OpenAIClient openAI,
                                    PropertyAISearchHandler propertyAI,
                                    ILogger<SearchAIOrchestrator> logger)
        {
            _openAI = openAI;
            _propertyAI = propertyAI;
            _logger = logger;
        }

        public async Task<SearchAIResponseDto> HandleAsync(SearchAIRequestDto request, CancellationToken ct = default)
        {
            var filters = await _openAI.InterpretTextAsync(request.Query, ct);
            var properties = await _propertyAI.SearchPropertiesWithFiltersAsync(filters, ct);
            var ai = await _openAI.ResponderComoChatbotAsync(request.Query, properties, ct);

            return new SearchAIResponseDto { Properties = properties, AIResponse = ai };
        }
    }
}
