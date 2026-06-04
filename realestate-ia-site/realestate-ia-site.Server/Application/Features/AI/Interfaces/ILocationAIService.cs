namespace realestate_ia_site.Server.Application.Features.AI.Interfaces;

public interface ILocationAIService
{
    Task<List<string>> GetNearbyLocationsAsync(string location, CancellationToken cancellationToken = default);
    Task<List<string>> GetLocationsBetweenAsync(string location1, string location2, CancellationToken cancellationToken = default);
}
