using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Application.PropertySearch.Filters;

public interface IPropertyFilter
{
    bool CanHandle(string filterKey);
    Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default);
    string GetFilterName();
}
