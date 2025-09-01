using realestate_ia_site.Server.Domain.Entities;
using System.Threading;
using System.Threading.Tasks;

namespace realestate_ia_site.Server.Infrastructure.Persistence.Filters
{
    public interface IPropertyFilter
    {
        bool CanHandle(string filterKey);
        Task<IQueryable<Property>> ApplyAsync(IQueryable<Property> query, Dictionary<string, object> filters, CancellationToken cancellationToken = default);
        string GetFilterName();
    }
}