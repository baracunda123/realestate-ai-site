namespace realestate_ia_site.Server.Domain.ValueObjects;

/// <summary>
/// Value Object para endereço estruturado (normaliza manipulação e evita strings soltas).
/// </summary>
public sealed class Address : IEquatable<Address>
{
    public string? Street { get; }
    public string? City { get; }
    public string? County { get; }
    public string? CivilParish { get; }
    public string? State { get; }
    public string? ZipCode { get; }
    public string Country { get; } = "Portugal";

    private Address(string? street, string? city, string? county, string? civilParish, string? state, string? zipCode, string? country)
    {
        Street = Normalize(street);
        City = Normalize(city);
        County = Normalize(county);
        CivilParish = Normalize(civilParish);
        State = Normalize(state);
        ZipCode = Normalize(zipCode);
        Country = string.IsNullOrWhiteSpace(country) ? "Portugal" : country.Trim();
    }

    public static Address Create(
        string? street,
        string? city,
        string? county = null,
        string? civilParish = null,
        string? state = null,
        string? zipCode = null,
        string? country = null) => new(street, city, county, civilParish, state, zipCode, country);

    private static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public override string ToString()
    {
        var parts = new[] { Street, CivilParish, City, County, State, ZipCode, Country };
        return string.Join(", ", parts.Where(p => !string.IsNullOrWhiteSpace(p)));
    }

    public bool Equals(Address? other)
    {
        if (other is null) return false;
        return Street == other.Street && City == other.City && County == other.County &&
               CivilParish == other.CivilParish && State == other.State && ZipCode == other.ZipCode && Country == other.Country;
    }

    public override bool Equals(object? obj) => obj is Address a && Equals(a);
    public override int GetHashCode() => HashCode.Combine(Street, City, County, CivilParish, State, ZipCode, Country);
}
