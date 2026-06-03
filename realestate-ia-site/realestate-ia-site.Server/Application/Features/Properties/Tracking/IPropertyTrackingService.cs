namespace realestate_ia_site.Server.Application.Features.Properties.Tracking
{
    public interface IPropertyTrackingService
    {
        Task<(int updated, int archived)> UpdatePropertyTrackingAsync(List<string> propertyIds, string sourceSite);
        Task<int> ArchiveStalePropertiesAsync(string sourceSite, DateTime cutoffDate);
        Task<int> DeleteExpiredPropertiesAsync(int daysAfterArchive = 90);
    }
}
