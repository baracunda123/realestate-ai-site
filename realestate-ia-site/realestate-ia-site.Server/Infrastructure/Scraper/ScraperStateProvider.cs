using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Data;
using realestate_ia_site.Server.Infrastructure.Persistence;

namespace realestate_ia_site.Server.Infrastructure.Scraper
{
    public class ScraperStateProvider
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<ScraperStateProvider> _logger;
        public ScraperStateProvider(ApplicationDbContext context, ILogger<ScraperStateProvider> logger)
        {
            _context = context;
            _logger = logger;

        }

        public async Task<int> GetCurrentPageAsync(string site, string location)
        {
            _logger.LogInformation("Retrieving current page...");

            var scrapingState = await _context.ScrapingStates
                .FirstOrDefaultAsync(s => s.Site == site && s.Location == location);

            var currentPage = scrapingState?.CurrentPage ?? 1;

            _logger.LogInformation("Current scraper state: Page {CurrentPage} - Site: {Site}, Location: {Location}"
                                  , currentPage, site, location);
            return currentPage;
        }

        public async Task UpdateCurrentPageAsync(string site, string location, int currentPage)
        {
            _logger.LogInformation("Updating current scraper state - Site: {Site}, Location: {Location}, Page: {Page}",
                site, location, currentPage);
            var state = await _context.ScrapingStates.FirstOrDefaultAsync(s => s.Site == site && s.Location == location);
           
            if (state == null)
            {
                _logger.LogInformation("New site or location found");

                state = new Domain.Entities.ScrapingState
                {
                    Id = Guid.NewGuid().ToString(),
                    Site = site,
                    Location = location,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    CurrentPage = currentPage
                };
                _context.ScrapingStates.Add(state);

                _logger.LogInformation("Added new state");

            }
            else
            {
                state.CurrentPage = currentPage;
                state.UpdatedAt = DateTime.UtcNow;
            }
            await _context.SaveChangesAsync();
            _logger.LogInformation("Current scraper state updated successfully");
        }
    }
}
