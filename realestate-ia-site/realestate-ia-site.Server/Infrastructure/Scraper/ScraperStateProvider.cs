using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Infrastructure.Persistence;

namespace realestate_ia_site.Server.Infrastructure.Scraper
{
    public class ScraperStateProvider
    {
        private readonly ApplicationDbContext _context;

        public ScraperStateProvider(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Domain.Entities.ScrapingState?> GetStateAsync(string site, string location)
        {
            return await _context.ScrapingStates
                .FirstOrDefaultAsync(s => s.Site == site && s.Location == location);
        }

        public async Task<int> GetCurrentPageAsync(string site, string location)
        {
            var state = await GetStateAsync(site, location);
            return state?.CurrentPage ?? 1;
        }

        public async Task UpdateCurrentPageAsync(string site, string location, int page)
        {
            var state = await GetStateAsync(site, location);
            
            if (state != null)
            {
                state.CurrentPage = page;
                state.UpdatedAt = DateTime.UtcNow;
                _context.ScrapingStates.Update(state);
            }
            else
            {
                state = new Domain.Entities.ScrapingState
                {
                    Id = Guid.NewGuid().ToString(),
                    Site = site,
                    Location = location,
                    CurrentPage = page,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                await _context.ScrapingStates.AddAsync(state);
            }

            await _context.SaveChangesAsync();
        }

        public async Task SaveStateAsync(Domain.Entities.ScrapingState state)
        {
            var existing = await _context.ScrapingStates
                .FirstOrDefaultAsync(s => s.Site == state.Site && s.Location == state.Location);

            if (existing != null)
            {
                existing.CurrentPage = state.CurrentPage;
                existing.UpdatedAt = DateTime.UtcNow;
                _context.ScrapingStates.Update(existing);
            }
            else
            {
                state.CreatedAt = DateTime.UtcNow;
                state.UpdatedAt = DateTime.UtcNow;
                await _context.ScrapingStates.AddAsync(state);
            }

            await _context.SaveChangesAsync();
        }
    }
}
