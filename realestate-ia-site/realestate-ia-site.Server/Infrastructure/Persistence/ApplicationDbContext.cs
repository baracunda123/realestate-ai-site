using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;
using realestate_ia_site.Server.Application.Common.Events;
using realestate_ia_site.Server.Domain.Events;
using realestate_ia_site.Server.Application.Common.Interfaces;

namespace realestate_ia_site.Server.Infrastructure.Persistence
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
        public DbSet<PropertyPriceHistory> PropertyPriceHistories { get; set; }
        public DbSet<UserLoginSession> UserLoginSessions { get; set; }
        public DbSet<Favorite> Favorites { get; set; }
        public DbSet<PropertyRecommendation> PropertyRecommendations { get; set; }
        public DbSet<UserSearchHistory> UserSearchHistories { get; set; }
        public DbSet<PropertyViewHistory> PropertyViewHistories { get; set; }
        public DbSet<ChatUsageQuota> ChatUsageQuotas { get; set; }
        public DbSet<ChatSession> ChatSessions { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<ChatSessionProperty> ChatSessionProperties { get; set; }
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

            // Configurações para PropertyRecommendation
            builder.Entity<PropertyRecommendation>(entity =>
            {
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.PropertyId);
                entity.HasIndex(e => new { e.UserId, e.PropertyId });
                entity.HasIndex(e => e.IsActive);
                entity.HasIndex(e => e.Score);
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

            // Configurações para PropertyPriceHistory
            builder.Entity<PropertyPriceHistory>(entity =>
            {
                entity.HasIndex(e => e.PropertyId);
                entity.HasIndex(e => e.ChangedAt);
                entity.HasIndex(e => new { e.PropertyId, e.ChangedAt });

                entity.HasOne(e => e.Property)
                      .WithMany()
                      .HasForeignKey(e => e.PropertyId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.Property(e => e.OldPrice)
                      .HasPrecision(18, 2);

                entity.Property(e => e.NewPrice)
                      .HasPrecision(18, 2);
            });

            // Configurações para UserSearchHistory (otimizado para performance)
            builder.Entity<UserSearchHistory>(entity =>
            {
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.SessionId);
                entity.HasIndex(e => e.CreatedAt);
                entity.HasIndex(e => new { e.UserId, e.CreatedAt }); // Para queries por utilizador ordenadas por data

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.SetNull); // Manter histórico mesmo se utilizador for eliminado
            });

            // Configurações para PropertyViewHistory (otimizado para performance)
            builder.Entity<PropertyViewHistory>(entity =>
            {
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.PropertyId);
                entity.HasIndex(e => new { e.UserId, e.PropertyId }).IsUnique(); // Um registro por usuário por propriedade
                entity.HasIndex(e => new { e.UserId, e.ViewedAt }); // Para queries por usuário ordenadas por data
                entity.HasIndex(e => e.ViewedAt);

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Property)
                      .WithMany()
                      .HasForeignKey(e => e.PropertyId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configurações para Property
            builder.Entity<Property>(entity =>
            {
                // Link deve ser único - é o identificador real da propriedade
                entity.HasIndex(e => e.Link)
                    .IsUnique()
                    .HasFilter("link IS NOT NULL AND link != ''");

                // Índices para performance
                entity.HasIndex(e => e.SourceSite);
                entity.HasIndex(e => e.City);
                entity.HasIndex(e => e.County);
                entity.HasIndex(e => e.Type);
                entity.HasIndex(e => e.Price);
                entity.HasIndex(e => e.CreatedAt);
                entity.HasIndex(e => new { e.City, e.Type, e.Price }); // Índice composto para pesquisas comuns
                
                // Índices para tracking de anúncios
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => e.LastSeenAt);
                entity.HasIndex(e => new { e.Status, e.LastSeenAt }); // Para queries de limpeza
                entity.HasIndex(e => new { e.SourceSite, e.Status }); // Para queries por source
            });

            // Configurações para ChatUsageQuota
            builder.Entity<ChatUsageQuota>(entity =>
            {
                entity.HasIndex(e => e.UserId).IsUnique();
                entity.HasIndex(e => e.PlanType);
                entity.HasIndex(e => e.PeriodEnd);

                entity.HasOne(e => e.User)
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configurações para ChatSession
            builder.Entity<ChatSession>(entity =>
            {
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.IsActive);
                entity.HasIndex(e => new { e.UserId, e.UpdatedAt });
                entity.HasIndex(e => e.CreatedAt);

                entity.HasOne<User>()
                      .WithMany()
                      .HasForeignKey(e => e.UserId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configurações para ChatMessage
            builder.Entity<ChatMessage>(entity =>
            {
                entity.HasIndex(e => e.SessionId);
                entity.HasIndex(e => new { e.SessionId, e.Timestamp });
                entity.HasIndex(e => e.Timestamp);

                entity.HasOne(e => e.Session)
                      .WithMany(s => s.Messages)
                      .HasForeignKey(e => e.SessionId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configurações para ChatSessionProperty
            builder.Entity<ChatSessionProperty>(entity =>
            {
                entity.HasIndex(e => e.SessionId);
                entity.HasIndex(e => e.PropertyId);
                entity.HasIndex(e => new { e.SessionId, e.DisplayOrder });
                entity.HasIndex(e => new { e.SessionId, e.PropertyId }).IsUnique();

                entity.HasOne(e => e.Session)
                      .WithMany()
                      .HasForeignKey(e => e.SessionId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(e => e.Property)
                      .WithMany()
                      .HasForeignKey(e => e.PropertyId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // Configurações para Subscription
            builder.Entity<Subscription>(entity =>
            {
                entity.HasIndex(e => e.UserId);
                entity.HasIndex(e => e.StripeId).IsUnique();
                entity.HasIndex(e => e.CustomerId);
                entity.HasIndex(e => e.Status);
                entity.HasIndex(e => new { e.UserId, e.Status });

                entity.HasOne(e => e.User)
                      .WithMany(u => u.Subscriptions)
                      .HasForeignKey(e => e.UserId)
                      .HasPrincipalKey(u => u.Id)
                      .OnDelete(DeleteBehavior.Cascade);
            });
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            // Desabilitar temporariamente o tracking de mudanças em Users durante este SaveChanges
            foreach (var userEntry in ChangeTracker.Entries<User>())
            {
                if (userEntry.State == EntityState.Modified)
                {
                    // Marcar apenas propriedades específicas como modificadas
                    // Evitar conflitos com ConcurrencyStamp
                    userEntry.Property(nameof(User.UpdatedAt)).IsModified = true;
                    
                    // Se outras propriedades foram modificadas, manter
                    var modifiedProperties = userEntry.Properties
                        .Where(p => p.IsModified && p.Metadata.Name != nameof(User.ConcurrencyStamp))
                        .ToList();
                    
                    // Reset e reaplica modificações
                    foreach (var prop in modifiedProperties)
                    {
                        prop.IsModified = true;
                    }
                    
                    // Atualizar timestamp
                    userEntry.Entity.UpdatedAt = DateTime.UtcNow;
                }
            }

            // Atualizar timestamps para PropertyRecommendation
            var recommendationEntries = ChangeTracker.Entries<PropertyRecommendation>()
                .Where(e => e.State == EntityState.Modified);

            foreach (var entry in recommendationEntries)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }

            var domainEvents = new List<IDomainEvent>();

            // Eventos de propriedades
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
                    var priceHistory = entry.Entity.EvaluatePriceChange(originalPrice);
                    if (priceHistory != null)
                    {
                        PropertyPriceHistories.Add(priceHistory);
                    }
                }
            }

            // Eventos de Favoritos
            var favoriteEntries = ChangeTracker.Entries<Favorite>()
                .Where(e => e.State == EntityState.Added)
                .Select(e => new { e.Entity.UserId, e.Entity.PropertyId })
                .ToList(); // Materializar ANTES de SaveChanges

            // Guardar alterações com retry em caso de concorrência
            int result;
            int retryCount = 0;
            const int maxRetries = 3;
            
            while (true)
            {
                try
                {
                    result = await base.SaveChangesAsync(cancellationToken);
                    break; // Sucesso, sair do loop
                }
                catch (DbUpdateConcurrencyException ex)
                {
                    retryCount++;
                    
                    if (retryCount >= maxRetries)
                    {
                        Console.WriteLine($"Max retries ({maxRetries}) exceeded for concurrency conflict");
                        throw; // Re-lançar após máximo de tentativas
                    }
                    
                    Console.WriteLine($"Concurrency conflict detected (attempt {retryCount}/{maxRetries}), retrying...");
                    
                    // Refresh entities from database
                    foreach (var entry in ex.Entries)
                    {
                        if (entry.Entity is User)
                        {
                            // Para Users, recarregar da DB
                            await entry.ReloadAsync(cancellationToken);
                            
                            // Reaplicar mudanças necessárias
                            if (entry.Entity is User user)
                            {
                                user.UpdatedAt = DateTime.UtcNow;
                            }
                        }
                        else
                        {
                            // Para outras entidades, usar valores atuais
                            var databaseValues = await entry.GetDatabaseValuesAsync(cancellationToken);
                            if (databaseValues != null)
                            {
                                entry.OriginalValues.SetValues(databaseValues);
                            }
                        }
                    }
                    
                    // Aguardar um pouco antes de retentar
                    await Task.Delay(100 * retryCount, cancellationToken);
                }
            }

            // Processar eventos de favoritos
            foreach (var favorite in favoriteEntries)
            {
                try
                {
                    // Usar AsNoTracking para evitar conflitos
                    var property = await Properties
                        .AsNoTracking()
                        .FirstOrDefaultAsync(p => p.Id == favorite.PropertyId, cancellationToken);
                    
                    if (property != null)
                    {
                        domainEvents.Add(new FavoriteAddedEvent
                        {
                            UserId = favorite.UserId,
                            PropertyId = favorite.PropertyId,
                            Property = property
                        });
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error processing favorite event: {ex.Message}");
                }
            }

            // Publicar eventos
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
