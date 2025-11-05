using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;

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
    DbSet<Favorite> Favorites { get; }
    DbSet<PropertyRecommendation> PropertyRecommendations { get; }
    DbSet<PropertyAlertNotification> PropertyAlertNotifications { get; }
    DbSet<UserSearchHistory> UserSearchHistories { get; }
    DbSet<ChatUsageQuota> ChatUsageQuotas { get; }
    DbSet<ChatSession> ChatSessions { get; }
    DbSet<ChatMessage> ChatMessages { get; }
    DbSet<User> Users { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
