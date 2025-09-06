using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models;

namespace realestate_ia_site.Server.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<Property> Properties { get; }
    DbSet<Subscription> Subscriptions { get; }
    DbSet<ScrapingState> ScrapingStates { get; }
    DbSet<WebhookEvent> WebhookEvents { get; }
    DbSet<PropertyAlert> PropertyAlerts { get; }
    DbSet<PropertyPriceHistory> PropertyPriceHistories { get; }
    DbSet<UserLoginSession> UserLoginSessions { get; }
    DbSet<User> Users { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
