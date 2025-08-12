using realestate_ia_site.Server.DTOs.SearchAI;
using realestate_ia_site.Server.Infrastructure.AI.Interfaces;
using realestate_ia_site.Server.Infrastructure.Persistence.Interfaces;

namespace realestate_ia_site.Server.Application.SearchAI
{
    public sealed class SearchAIOrchestrator 
    {
        private readonly IPropertyFilterInterpreter _filterInterpreter;
        private readonly IPropertyResponseGenerator _responseGenerator;
        private readonly IPropertySearchService _propertySearchService; // Mudança aqui
        private readonly ILogger<SearchAIOrchestrator> _logger;

        public SearchAIOrchestrator(
            IPropertyFilterInterpreter filterInterpreter,
            IPropertyResponseGenerator responseGenerator,
            IPropertySearchService propertySearchService, // Mudança aqui
            ILogger<SearchAIOrchestrator> logger)
        {
            _filterInterpreter = filterInterpreter;
            _responseGenerator = responseGenerator;
            _propertySearchService = propertySearchService; // Mudança aqui
            _logger = logger;
        }

        public async Task<SearchAIResponseDto> HandleAsync(SearchAIRequestDto request, CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(request, nameof(request));
            ArgumentException.ThrowIfNullOrWhiteSpace(request.Query, nameof(request.Query));

            _logger.LogInformation("Processing search request: {Query}", request.Query);
            
            try
            {
                // Interpret the user query into filters
                var filters = await _filterInterpreter.ExtractFiltersAsync(request.Query, ct);      
                
                // Search for properties using the service (não o handler)
                var properties = await _propertySearchService.SearchPropertiesWithFiltersAsync(filters, ct);
                
                // Generate AI response
                var aiResponse = await _responseGenerator.GenerateResponseAsync(request.Query, properties, ct);

                _logger.LogInformation("Search completed. Found {PropertyCount} properties", properties.Count);
                
                return new SearchAIResponseDto { Properties = properties, AIResponse = aiResponse };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing search request: {Query}", request.Query);
                throw;
            }
        }
    }
}
