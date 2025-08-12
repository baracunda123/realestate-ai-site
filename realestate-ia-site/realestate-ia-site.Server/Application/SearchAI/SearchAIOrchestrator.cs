using realestate_ia_site.Server.DTOs.SearchAI;
using realestate_ia_site.Server.Infrastructure.AI.Interfaces;

namespace realestate_ia_site.Server.Application.SearchAI
{
    public sealed class SearchAIOrchestrator 
    {
        private readonly IPropertyFilterInterpreter _filterInterpreter;
        private readonly IPropertyResponseGenerator _responseGenerator;
        private readonly PropertySearchHandler _propertySearchHandler;
        private readonly ILogger<SearchAIOrchestrator> _logger;

        public SearchAIOrchestrator(IPropertyFilterInterpreter filterInterpreter,
                                    IPropertyResponseGenerator responseGenerator,
                                    PropertySearchHandler propertySearchHandler,
                                    ILogger<SearchAIOrchestrator> logger)
        {
            _filterInterpreter = filterInterpreter;
            _responseGenerator = responseGenerator;
            _propertySearchHandler = propertySearchHandler;
            _logger = logger;
        }

        public async Task<SearchAIResponseDto> HandleAsync(SearchAIRequestDto request, CancellationToken ct = default)
        {
            _logger.LogInformation("Processing search request: {Query}", request.Query);
            
            // Interpret the user query into filters
            var filters = await _filterInterpreter.ExtractFiltersAsync(request.Query, ct);      
            
            // Search for properties using the filters
            var properties = await _propertySearchHandler.SearchPropertiesWithFiltersAsync(filters, ct);
            
            // Generate AI response
            var aiResponse = await _responseGenerator.GenerateResponseAsync(request.Query, properties, ct);

            _logger.LogInformation("Search completed. Found {PropertyCount} properties", properties.Count);
            
            return new SearchAIResponseDto { Properties = properties, AIResponse = aiResponse };
        }
    }
}
