namespace realestate_ia_site.Server.Application.Features.AI.Interfaces
{
    public interface IPropertyFilterInterpreter
    {
        Task<Dictionary<string, object>> ExtractFiltersAsync(string userQuery, CancellationToken cancellationToken = default);
        Task<Dictionary<string, object>> ExtractFiltersAsync(string userQuery, string sessionId, CancellationToken cancellationToken = default);
        Task<Dictionary<string, object>> ExtractFiltersAsync(string userQuery, string sessionId, string userPlan, CancellationToken cancellationToken = default);
    }
}
