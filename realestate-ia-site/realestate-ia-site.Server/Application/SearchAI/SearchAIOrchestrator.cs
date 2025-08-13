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
        private readonly PropertyResponseParser _responseParser; 
        private readonly ILogger<SearchAIOrchestrator> _logger;

        public SearchAIOrchestrator(
            IPropertyFilterInterpreter filterInterpreter,
            IPropertyResponseGenerator responseGenerator,
            IPropertySearchService propertySearchService,
            PropertyResponseParser responseParser, 
            ILogger<SearchAIOrchestrator> logger)
        {
            _filterInterpreter = filterInterpreter;
            _responseGenerator = responseGenerator;
            _propertySearchService = propertySearchService; 
            _responseParser = responseParser; 
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
                var filters = await _filterInterpreter.ExtractFiltersAsync(request.Query, request.SessionId, ct);

                var properties = await _propertySearchService.SearchPropertiesWithFiltersAsync(filters, ct);

                // Generate AI response baseada nos resultados da pesquisa
                var aiResponse = await _responseGenerator.GenerateResponseAsync(request.Query, properties, request.SessionId, ct);

                // Usar o novo método que faz parse e limpa a resposta
                var parsingResult = _responseParser.ParseResponse(aiResponse, properties);

                _logger.LogInformation("Search completed. Found {SearchCount} properties, AI mentioned {MentionedCount}",
                  properties.Count, parsingResult.MentionedProperties.Count);
                
                return new SearchAIResponseDto 
                { 
                    Properties = parsingResult.MentionedProperties,
                    AIResponse = parsingResult.CleanResponse 
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
