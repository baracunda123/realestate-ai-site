using realestate_ia_site.Server.Application.Common.DTOs;
using realestate_ia_site.Server.Application.Features.AI.Interfaces;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public class PropertyAIService
    {
        private readonly IPropertyFilterInterpreter _filterInterpreter;
        private readonly IPropertyResponseGenerator _responseGenerator;
        private readonly ILogger<PropertyAIService> _logger;

        public PropertyAIService(
            IPropertyFilterInterpreter filterInterpreter,
            IPropertyResponseGenerator responseGenerator,
            ILogger<PropertyAIService> logger)
        {
            _filterInterpreter = filterInterpreter;
            _responseGenerator = responseGenerator;
            _logger = logger;
        }

        public async Task<Dictionary<string, object>> ExtractFiltersAsync(string userQuery, CancellationToken cancellationToken = default)
        {
            return await _filterInterpreter.ExtractFiltersAsync(userQuery, cancellationToken);
        }

        public async Task<string> GenerateResponseAsync(string originalQuery, List<PropertySearchDto> properties, CancellationToken cancellationToken = default)
        {
            return await _responseGenerator.GenerateResponseAsync(originalQuery, properties, cancellationToken);
        }
    }
}
