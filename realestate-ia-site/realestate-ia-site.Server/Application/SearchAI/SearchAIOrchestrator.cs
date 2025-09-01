using Microsoft.OpenApi.Services;
using realestate_ia_site.Server.DTOs.SearchAI;
using realestate_ia_site.Server.Infrastructure.AI;
using realestate_ia_site.Server.Infrastructure.AI.Interfaces;
using realestate_ia_site.Server.Infrastructure.Persistence.Interfaces;

namespace realestate_ia_site.Server.Application.SearchAI
{
    public sealed class SearchAIOrchestrator 
    {
        private readonly IPropertyFilterInterpreter _filterInterpreter;
        private readonly IPropertyResponseGenerator _responseGenerator;
        private readonly IPropertySearchService _propertySearchService; 
        private readonly ILogger<SearchAIOrchestrator> _logger;

        public SearchAIOrchestrator(
            IPropertyFilterInterpreter filterInterpreter,
            IPropertyResponseGenerator responseGenerator,
            IPropertySearchService propertySearchService,
            ILogger<SearchAIOrchestrator> logger)
        {
            _filterInterpreter = filterInterpreter;
            _responseGenerator = responseGenerator;
            _propertySearchService = propertySearchService; 
            _logger = logger;
        }

        public async Task<SearchAIResponseDto> HandleAsync(SearchAIRequestDto request, CancellationToken ct = default)
        {
            ArgumentNullException.ThrowIfNull(request, nameof(request));
            ArgumentException.ThrowIfNullOrWhiteSpace(request.Query, nameof(request.Query));

            _logger.LogInformation("Processing search request: {Query}", request.Query);
            
            try
            {
                var filters = await _filterInterpreter.ExtractFiltersAsync(request.Query, request.SessionId, ct);
                var properties = await _propertySearchService.SearchPropertiesWithFiltersAsync(filters, ct);
                var aiResponse = await _responseGenerator.GenerateResponseAsync(request.Query, properties, request.SessionId, ct);

                _logger.LogInformation("Search completed. Found {SearchCount} properties.", properties.Count);
                
                return new SearchAIResponseDto 
                { 
                    Properties = properties,
                    AIResponse = aiResponse
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing search request: {Query}", request.Query);
                throw;
            }
        }
    }
}
