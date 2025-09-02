namespace realestate_ia_site.Server.Infrastructure.Notifications
{
    public interface ISmsService
    {
        Task<bool> SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default);
        Task<bool> SendBulkSmsAsync(IEnumerable<(string phoneNumber, string message)> messages, CancellationToken cancellationToken = default);
    }
}