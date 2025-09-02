using Microsoft.AspNetCore.Identity; 
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Domain.Models;
using realestate_ia_site.Server.Infrastructure.Events;

namespace realestate_ia_site.Server.Data
{
    public class ApplicationDbContext : IdentityDbContext<User>
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

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

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
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            // Atualizar timestamps
            var entries = ChangeTracker.Entries<User>()
                .Where(e => e.State == EntityState.Modified);

            foreach (var entry in entries)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }

            // Resto da lógica existente para eventos...
            var events = new List<IDomainEvent>();
            
            foreach (var entry in ChangeTracker.Entries<Property>())
            {
                if (entry.State == EntityState.Added)
                {
                    events.Add(new PropertyCreatedEvent 
                    { 
                        PropertyId = entry.Entity.Id, 
                        Property = entry.Entity 
                    });
                }
                else if (entry.State == EntityState.Modified)
                {
                    var originalPrice = entry.OriginalValues.GetValue<decimal?>(nameof(Property.Price));
                    var currentPrice = entry.CurrentValues.GetValue<decimal?>(nameof(Property.Price));
                    
                    if (originalPrice != currentPrice && originalPrice.HasValue && currentPrice.HasValue)
                    {
                        PropertyPriceHistories.Add(new PropertyPriceHistory
                        {
                            PropertyId = entry.Entity.Id,
                            OldPrice = originalPrice.Value,
                            NewPrice = currentPrice.Value,
                            ChangeReason = "update"
                        });

                        events.Add(new PropertyPriceChangedEvent 
                        { 
                            PropertyId = entry.Entity.Id,
                            Property = entry.Entity,
                            OldPrice = originalPrice.Value,
                            NewPrice = currentPrice.Value
                        });
                    }
                }
            }

            var result = await base.SaveChangesAsync(cancellationToken);

            foreach (var domainEvent in events)
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
