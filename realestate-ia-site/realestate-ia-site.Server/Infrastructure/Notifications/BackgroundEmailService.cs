using Hangfire;
using realestate_ia_site.Server.Application.Notifications.Interfaces;

namespace realestate_ia_site.Server.Infrastructure.Notifications;

/// <summary>
/// Wrapper para envio assíncrono de emails usando Hangfire.
/// Evita bloqueio de threads HTTP durante envio de emails.
/// </summary>
public class BackgroundEmailService
{
    private readonly IBackgroundJobClient _backgroundJobClient;
    private readonly ILogger<BackgroundEmailService> _logger;

    public BackgroundEmailService(
        IBackgroundJobClient backgroundJobClient,
        ILogger<BackgroundEmailService> logger)
    {
        _backgroundJobClient = backgroundJobClient;
        _logger = logger;
    }

    /// <summary>
    /// Enfileira email de confirmação para envio em background.
    /// Retorna imediatamente sem bloquear a thread.
    /// </summary>
    public string EnqueueEmailConfirmation(string recipientEmail, string userName, string confirmationLink)
    {
        _logger.LogInformation("[BackgroundEmail] Enfileirando email de confirmação para {Email}", recipientEmail);

        var jobId = _backgroundJobClient.Enqueue<IEmailService>(emailService =>
            emailService.SendTemplateEmailAsync(
                "email-confirmation",
                recipientEmail,
                new { UserName = userName, ConfirmationLink = confirmationLink },
                CancellationToken.None
            )
        );

        _logger.LogInformation("[BackgroundEmail] Email de confirmação enfileirado jobId={JobId}", jobId);
        return jobId;
    }

    /// <summary>
    /// Enfileira email de reset de password para envio em background.
    /// Retorna imediatamente sem bloquear a thread.
    /// </summary>
    public string EnqueuePasswordReset(string recipientEmail, string userName, string resetLink)
    {
        _logger.LogInformation("[BackgroundEmail] Enfileirando email de reset para {Email}", recipientEmail);

        var jobId = _backgroundJobClient.Enqueue<IEmailService>(emailService =>
            emailService.SendTemplateEmailAsync(
                "password-reset",
                recipientEmail,
                new { UserName = userName, ResetLink = resetLink },
                CancellationToken.None
            )
        );

        _logger.LogInformation("[BackgroundEmail] Email de reset enfileirado jobId={JobId}", jobId);
        return jobId;
    }

    /// <summary>
    /// Enfileira múltiplos emails para envio em background com rate limiting.
    /// Processa em batches de 10 emails com delay de 100ms entre batches.
    /// </summary>
    public List<string> EnqueueBulkEmails(string templateId, List<(string Email, object Data)> recipients)
    {
        _logger.LogInformation("[BackgroundEmail] Enfileirando {Count} emails em bulk template={TemplateId}", 
            recipients.Count, templateId);

        var jobIds = new List<string>();
        const int BATCH_SIZE = 10;
        var batches = recipients.Chunk(BATCH_SIZE).ToList();

        for (int i = 0; i < batches.Count; i++)
        {
            var batch = batches[i];
            var delaySeconds = i * 10; // 10s entre cada batch de 10 emails

            foreach (var (email, data) in batch)
            {
                var jobId = _backgroundJobClient.Schedule<IEmailService>(
                    emailService => emailService.SendTemplateEmailAsync(
                        templateId,
                        email,
                        data,
                        CancellationToken.None
                    ),
                    TimeSpan.FromSeconds(delaySeconds)
                );

                jobIds.Add(jobId);
            }
        }

        _logger.LogInformation("[BackgroundEmail] {Count} emails enfileirados em {Batches} batches", 
            recipients.Count, batches.Count);

        return jobIds;
    }
}
