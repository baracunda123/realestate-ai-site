namespace realestate_ia_site.Server.Domain.Exceptions;

/// <summary>
/// Exception thrown when a business rule is violated
/// </summary>
public class BusinessRuleViolationException : DomainException
{
    public BusinessRuleViolationException(string rule, string details)
        : base($"Business rule violation: {rule}. Details: {details}")
    {
        Rule = rule;
        Details = details;
    }

    public string Rule { get; }
    public string Details { get; }
}
