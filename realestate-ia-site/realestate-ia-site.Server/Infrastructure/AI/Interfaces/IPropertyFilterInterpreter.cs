namespace realestate_ia_site.Server.Infrastructure.AI.Interfaces
{
    public interface IPropertyFilterInterpreter
    {
        Task<Dictionary<string, object>> ExtractFiltersAsync(string userQuery, CancellationToken cancellationToken = default);
        Task<Dictionary<string, object>> ExtractFiltersAsync(string userQuery, string sessionId, CancellationToken cancellationToken = default);
    }
}