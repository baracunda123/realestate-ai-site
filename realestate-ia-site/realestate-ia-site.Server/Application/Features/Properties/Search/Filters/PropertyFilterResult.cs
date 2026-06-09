using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Application.Features.Properties.Search.Filters;

public sealed record PropertyFilterResult(
    IQueryable<Property> Query,
    IReadOnlyDictionary<string, List<string>>? MatchedFeatures = null);
