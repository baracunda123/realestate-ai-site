using realestate_ia_site.Server.Infrastructure.Notifications.Models;

namespace realestate_ia_site.Server.Application.Notifications.Interfaces;

public interface IEmailService
{
    Task<bool> SendEmailAsync(EmailMessage message, CancellationToken cancellationToken = default);
    Task<bool> SendTemplateEmailAsync(string templateId, string recipientEmail, object templateData, CancellationToken cancellationToken = default);
    Task<bool> SendBulkEmailAsync(IEnumerable<EmailMessage> messages, CancellationToken cancellationToken = default);
}
