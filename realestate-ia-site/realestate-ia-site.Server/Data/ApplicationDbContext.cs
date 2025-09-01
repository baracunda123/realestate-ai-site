using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Domain.Entities;

namespace realestate_ia_site.Server.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Property> Properties { get; set; }
        public DbSet<Subscription> Subscriptions { get; set; }
        public DbSet<ScrapingState> ScrapingStates { get; set; }
        public DbSet<WebhookEvent> WebhookEvents { get; set; }
    }
}
