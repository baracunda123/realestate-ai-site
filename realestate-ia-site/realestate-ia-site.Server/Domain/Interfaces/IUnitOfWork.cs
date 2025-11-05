namespace realestate_ia_site.Server.Domain.Interfaces;

/// <summary>
/// Unit of Work pattern for managing transactions
/// </summary>
public interface IUnitOfWork : IDisposable
{
    IPropertyRepository Properties { get; }
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
}
