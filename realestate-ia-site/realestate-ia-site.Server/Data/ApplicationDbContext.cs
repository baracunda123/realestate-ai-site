using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models;
using realestate_ia_site.Server.Application.Common.Events;
using realestate_ia_site.Server.Domain.Events;
using realestate_ia_site.Server.Application.Common.Interfaces;

namespace realestate_ia_site.Server.Data
{
    public class ApplicationDbContext : IdentityDbContext<User>, IApplicationDbContext
    {
        private readonly IDomainEventDispatcher _eventDispatcher;

        public ApplicationDbContext(
            DbContextOptions<ApplicationDbContext> options,
            IDomainEventDispatcher eventDispatcher) : base(options)
        {
            _eventDispatcher = eventDispatcher;
        }

        public DbSet<Property> Properties { get; set; }
        public DbSet<Subscription> Subscriptions { get; set; }
        public DbSet<ScrapingState> ScrapingStates { get; set; }
        public DbSet<WebhookEvent> WebhookEvents { get; set; }
        public DbSet<PropertyAlert> PropertyAlerts { get; set; }
        public DbSet<PropertyPriceHistory> PropertyPriceHistories { get; set; }
        public DbSet<UserLoginSession> UserLoginSessions { get; set; }
        public DbSet<Favorite> Favorites { get; set; }
        public DbSet<SavedSearch> SavedSearches { get; set; }
        public DbSet<User> Users => Set<User>();

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            // Configuração global para converter todos os DateTime para UTC
            foreach (var entityType in builder.Model.GetEntityTypes())
            {
                foreach (var property in entityType.GetProperties())
                {
                    if (property.ClrType == typeof(DateTime) || property.ClrType == typeof(DateTime?))
                    {
                        property.SetValueConverter(new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>(
                            v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
                            v => DateTime.SpecifyKind(v, DateTimeKind.Utc)
                        ));
                    }
                    else if (property.ClrType == typeof(DateTimeOffset) || property.ClrType == typeof(DateTimeOffset?))
                    {
                        property.SetValueConverter(new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTimeOffset, DateTimeOffset>(
                            v => v.ToUniversalTime(),
                            v => v.ToUniversalTime()
                        ));
                    }
                }
            }

            // Força nomes de tabelas do Identity
            builder.Entity<User>().ToTable("users");
            builder.Entity<IdentityUserLogin<string>>().ToTable("user_logins");
            builder.Entity<IdentityUserToken<string>>().ToTable("user_tokens");

            // IGNORAR todas as outras entidades do Identity para não criar tabelas
            builder.Ignore<IdentityRole>();
            builder.Ignore<IdentityUserRole<string>>();
            builder.Ignore<IdentityUserClaim<string>>();
            builder.Ignore<IdentityRoleClaim<string>>();

            // Configurações específicas para User
            builder.Entity<User>(entity =>
            {
                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.TokenIdentifier).IsUnique();
            });

            // Configurações para UserLoginSession
            builder.Entity<UserLoginSession>(entity =>
            {
                entity.HasIndex(e => e.SessionToken).IsUnique();
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.ExpiresAt);

                entity.HasOne(e => e.User)
                      .WithMany(u => u.LoginSessions)
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configurações específicas para WebhookEvent
            builder.Entity<WebhookEvent>(entity =>
            {
                entity.HasIndex(e => e.StripeEventId).IsUnique();
                entity.HasIndex(e => e.EventType);
                entity.HasIndex(e => e.CreatedAt);
            });

            // Configurações para Favorites
            builder.Entity<Favorite>(entity =>
            {
                entity.HasIndex(e => new { e.UserId, e.PropertyId }).IsUnique();
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.PropertyId);
                entity.HasIndex(e => e.CreatedAt);

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Property)
                      .WithMany()
                      .HasForeignKey(e => e.PropertyId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configurações para SavedSearch (simplified)
            builder.Entity<SavedSearch>(entity =>
            {
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.IsActive);
                entity.HasIndex(e => e.CreatedAt);

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.MinPrice)
                      .HasPrecision(18, 2);

                entity.Property(e => e.MaxPrice)
                      .HasPrecision(18, 2);
            });
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            // Atualizar timestamps para User
            var userEntries = ChangeTracker.Entries<User>()
                .Where(e => e.State == EntityState.Modified);

            foreach (var entry in userEntries)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }

            // Atualizar timestamps para SavedSearch
            var savedSearchEntries = ChangeTracker.Entries<SavedSearch>()
                .Where(e => e.State == EntityState.Modified);

            foreach (var entry in savedSearchEntries)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }

            var domainEvents = new List<IDomainEvent>();

            foreach (var entry in ChangeTracker.Entries<Property>())
            {
                if (entry.State == EntityState.Added)
                {
                    domainEvents.Add(new PropertyCreatedEvent
                    {
                        PropertyId = entry.Entity.Id,
                        Property = entry.Entity
                    });
                }
                else if (entry.State == EntityState.Modified)
                {
                    var originalPrice = entry.OriginalValues.GetValue<decimal?>(nameof(Property.Price));
                    var outcome = entry.Entity.EvaluatePriceChange(originalPrice);
                    if (outcome.HasChange)
                    {
                        PropertyPriceHistories.Add(outcome.History!);
                        domainEvents.Add(outcome.Event!);
                    }
                }
            }

            var result = await base.SaveChangesAsync(cancellationToken);

            foreach (var domainEvent in domainEvents)
            {
                try
                {
                    await _eventDispatcher.PublishAsync(domainEvent, cancellationToken);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error publishing event: {ex.Message}");
                }
            }

            return result;
        }
    }
}