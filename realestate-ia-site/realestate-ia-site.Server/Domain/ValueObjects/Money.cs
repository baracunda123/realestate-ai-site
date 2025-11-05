namespace realestate_ia_site.Server.Domain.ValueObjects;

/// <summary>
/// Value Object para representar valores monetários com moeda.
/// Não expõe setters públicos para garantir imutabilidade lógica.
/// </summary>
public readonly record struct Money
{
    public decimal Amount { get; }
    public string Currency { get; } = "EUR"; // Default para o contexto (Portugal)

    private Money(decimal amount, string currency)
    {
        Amount = decimal.Round(amount, 2, MidpointRounding.AwayFromZero);
        Currency = string.IsNullOrWhiteSpace(currency) ? "EUR" : currency.ToUpperInvariant();
    }

    public static Money From(decimal amount, string currency = "EUR") => new(amount, currency);
    public static Money FromEUR(decimal amount) => new(amount, "EUR");

    public override string ToString() => Currency switch
    {
        "EUR" => $"€{Amount:N0}",
        _ => $"{Amount:N2} {Currency}"
    };

    public Money Add(Money other)
    {
        EnsureSameCurrency(other);
        return new Money(Amount + other.Amount, Currency);
    }

    public Money Subtract(Money other)
    {
        EnsureSameCurrency(other);
        return new Money(Amount - other.Amount, Currency);
    }

    private void EnsureSameCurrency(Money other)
    {
        if (Currency != other.Currency)
            throw new InvalidOperationException($"Currency mismatch: {Currency} vs {other.Currency}");
    }
}
