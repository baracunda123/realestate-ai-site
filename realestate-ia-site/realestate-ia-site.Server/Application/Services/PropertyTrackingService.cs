using Microsoft.EntityFrameworkCore;
using realestate_ia_site.Server.Application.Common.Interfaces;
using realestate_ia_site.Server.Domain.Enums;

namespace realestate_ia_site.Server.Application.Services
{
    public interface IPropertyTrackingService
    {
        Task<(int updated, int archived)> UpdatePropertyTrackingAsync(List<string> propertyIds, string sourceSite);
        Task<int> ArchiveStalePropertiesAsync(string sourceSite, DateTime cutoffDate);
        Task<int> DeleteExpiredPropertiesAsync(int daysAfterArchive = 90);
    }

    public class PropertyTrackingService : IPropertyTrackingService
    {
        private readonly IApplicationDbContext _context;
        private readonly ILogger<PropertyTrackingService> _logger;

        public PropertyTrackingService(
            IApplicationDbContext context,
            ILogger<PropertyTrackingService> logger)
        {
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Atualiza o LastSeenAt dos anúncios vistos no scraping atual
        /// </summary>
        public async Task<(int updated, int archived)> UpdatePropertyTrackingAsync(
            List<string> propertyIds, 
            string sourceSite)
        {
            var now = DateTime.UtcNow;
            var updated = 0;
            var archived = 0;

            // Atualizar anúncios que foram vistos
            if (propertyIds.Any())
            {
                var properties = await _context.Properties
                    .Where(p => propertyIds.Contains(p.Id))
                    .ToListAsync();

                foreach (var property in properties)
                {
                    property.LastSeenAt = now;
                    
                    // Reativar se estava arquivado
                    if (property.Status != PropertyStatus.Active)
                    {
                        var previousStatus = property.Status;
                        property.Status = PropertyStatus.Active;
                        property.ArchivedAt = null;
                        _logger.LogInformation(
                            "Property {PropertyId} reactivated from {OldStatus}", 
                            property.Id, 
                            previousStatus);
                    }
                }

                updated = properties.Count;
                await _context.SaveChangesAsync();
            }

            // Arquivar anúncios não vistos baseado no período de scraping
            var cutoffDate = GetCutoffDateForSource(sourceSite);
            archived = await ArchiveStalePropertiesAsync(sourceSite, cutoffDate);

            _logger.LogInformation(
                "Property tracking updated for {SourceSite}: {Updated} updated, {Archived} archived",
                sourceSite, updated, archived);

            return (updated, archived);
        }

        /// <summary>
        /// Arquiva anúncios que não foram vistos e estão fora do período de scraping
        /// </summary>
        public async Task<int> ArchiveStalePropertiesAsync(string sourceSite, DateTime cutoffDate)
        {
            var now = DateTime.UtcNow;

            var staleProperties = await _context.Properties
                .Where(p => p.SourceSite == sourceSite
                         && p.LastSeenAt < cutoffDate
                         && p.Status == PropertyStatus.Active)
                .ToListAsync();

            foreach (var property in staleProperties)
            {
                property.Status = PropertyStatus.Archived;
                property.ArchivedAt = now;
            }

            if (staleProperties.Any())
            {
                await _context.SaveChangesAsync();
                _logger.LogInformation(
                    "Archived {Count} stale properties from {SourceSite} (cutoff: {CutoffDate})",
                    staleProperties.Count, sourceSite, cutoffDate);
            }

            return staleProperties.Count;
        }

        /// <summary>
        /// Elimina anúncios arquivados há muito tempo
        /// </summary>
        public async Task<int> DeleteExpiredPropertiesAsync(int daysAfterArchive = 90)
        {
            var deleteThreshold = DateTime.UtcNow.AddDays(-daysAfterArchive);

            var expiredProperties = await _context.Properties
                .Where(p => p.Status == PropertyStatus.Archived
                         && p.ArchivedAt.HasValue
                         && p.ArchivedAt.Value < deleteThreshold)
                .ToListAsync();

            if (expiredProperties.Any())
            {
                _context.Properties.RemoveRange(expiredProperties);
                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Deleted {Count} expired properties (archived before {Threshold})",
                    expiredProperties.Count, deleteThreshold);
            }

            return expiredProperties.Count;
        }

        /// <summary>
        /// Retorna a data de corte - 7 dias para todos os sources
        /// Propriedades não vistas há mais de 1 semana são arquivadas
        /// </summary>
        private DateTime GetCutoffDateForSource(string sourceSite)
        {
            // Cutoff uniforme de 7 dias para todos os sources
            return DateTime.UtcNow.AddDays(-7);
        }
    }
}
