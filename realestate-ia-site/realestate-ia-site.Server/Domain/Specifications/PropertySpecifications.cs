using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Domain.Specifications;

/// <summary>
/// Specification for filtering properties by price range
/// </summary>
public class PropertyByPriceRangeSpecification : BaseSpecification<Property>
{
    public PropertyByPriceRangeSpecification(decimal? minPrice, decimal? maxPrice)
        : base(p => 
            (!minPrice.HasValue || (p.Price.HasValue && p.Price.Value >= minPrice.Value)) &&
            (!maxPrice.HasValue || (!p.Price.HasValue || p.Price.Value <= maxPrice.Value)))
    {
        ApplyOrderBy(p => p.Price ?? 0);
    }
}

/// <summary>
/// Specification for filtering properties by location
/// </summary>
public class PropertyByLocationSpecification : BaseSpecification<Property>
{
    public PropertyByLocationSpecification(string location)
        : base(p => 
            (p.City != null && p.City.ToLower().Contains(location.ToLower())) ||
            (p.State != null && p.State.ToLower().Contains(location.ToLower())) ||
            (p.County != null && p.County.ToLower().Contains(location.ToLower())) ||
            (p.CivilParish != null && p.CivilParish.ToLower().Contains(location.ToLower())))
    {
    }
}

/// <summary>
/// Specification for filtering properties by area range
/// </summary>
public class PropertyByAreaRangeSpecification : BaseSpecification<Property>
{
    public PropertyByAreaRangeSpecification(double? minArea, double? maxArea)
        : base(p => 
            (!minArea.HasValue || (p.Area.HasValue && p.Area.Value >= minArea.Value)) &&
            (!maxArea.HasValue || (!p.Area.HasValue || p.Area.Value <= maxArea.Value)))
    {
        ApplyOrderBy(p => p.Area ?? 0);
    }
}

/// <summary>
/// Specification for filtering properties by type
/// </summary>
public class PropertyByTypeSpecification : BaseSpecification<Property>
{
    public PropertyByTypeSpecification(string type)
        : base(p => p.Type != null && p.Type.ToLower().Contains(type.ToLower()))
    {
    }
}

/// <summary>
/// Specification for getting recent properties
/// </summary>
public class RecentPropertiesSpecification : BaseSpecification<Property>
{
    public RecentPropertiesSpecification(int count)
        : base(p => true)
    {
        ApplyOrderByDescending(p => p.CreatedAt);
        ApplyPaging(0, count);
    }
}

/// <summary>
/// Specification for filtering properties by minimum bedrooms
/// </summary>
public class PropertyByBedroomsSpecification : BaseSpecification<Property>
{
    public PropertyByBedroomsSpecification(int minBedrooms)
        : base(p => p.Bedrooms >= minBedrooms)
    {
        ApplyOrderByDescending(p => p.Bedrooms);
    }
}
