namespace realestate_ia_site.Server.Domain.Exceptions;

/// <summary>
/// Exception thrown when an entity is in an invalid state
/// </summary>
public class InvalidEntityStateException : DomainException
{
    public InvalidEntityStateException(string entityName, string reason)
        : base($"{entityName} is in an invalid state: {reason}")
    {
        EntityName = entityName;
        Reason = reason;
    }

    public string EntityName { get; }
    public string Reason { get; }
}
