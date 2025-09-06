using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using realestate_ia_site.Server.Infrastructure.Notifications.Models;
using AppEmailService = realestate_ia_site.Server.Application.Notifications.Interfaces.IEmailService;
using realestate_ia_site.Server.Infrastructure.Configurations;

namespace realestate_ia_site.Server.Infrastructure.Notifications
{
    public class EmailService : AppEmailService
    {
        private readonly EmailConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IOptions<EmailConfiguration> config, ILogger<EmailService> logger)
        {
            _config = config.Value;
            _logger = logger;
        }

        public async Task<bool> SendEmailAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation("Iniciando envio de email para {Email} com assunto '{Subject}'", message.ToEmail, message.Subject);

                // Validar configurações antes de tentar criar o cliente
                if (string.IsNullOrEmpty(_config.SmtpHost) || string.IsNullOrEmpty(_config.Username) || string.IsNullOrEmpty(_config.Password))
                {
                    _logger.LogError("Configurações de email inválidas. SmtpHost: {Host}, Username: {Username}",
                        _config.SmtpHost, _config.Username);
                    return false;
                }

                using var client = CreateSmtpClient();
                using var mailMessage = CreateMailMessage(message);

                _logger.LogInformation("Cliente SMTP criado. Enviando email...");

                await client.SendMailAsync(mailMessage, cancellationToken);

                _logger.LogInformation("Email enviado com sucesso para {Email}", message.ToEmail);
                return true;
            }
            catch (SmtpException smtpEx)
            {
                _logger.LogError(smtpEx, "Erro SMTP ao enviar email para {Email}. StatusCode: {StatusCode}",
                    message.ToEmail, smtpEx.StatusCode);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro geral ao enviar email para {Email}", message.ToEmail);
                return false;
            }
        }

        public async Task<bool> SendTemplateEmailAsync(string templateId, string recipientEmail, object templateData, CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation("Iniciando envio de email template {TemplateId} para {Email}", templateId, recipientEmail);

                // Implementar templates de email aqui
                var template = GetEmailTemplate(templateId);
                var body = ProcessTemplate(template, templateData);

                var message = new EmailMessage
                {
                    ToEmail = recipientEmail,
                    Subject = template.Subject,
                    Body = body,
                    IsHtml = true // Certificar que está definido como HTML
                };

                _logger.LogInformation("Template {TemplateId} processado. Enviando email...", templateId);

                var result = await SendEmailAsync(message, cancellationToken);

                if (result)
                    _logger.LogInformation("Email template {TemplateId} enviado para {Email}", templateId, recipientEmail);
                else
                    _logger.LogWarning("Falha envio email template {TemplateId} para {Email}", templateId, recipientEmail);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro crítico ao enviar email template {TemplateId} para {Email}", templateId, recipientEmail);
                return false;
            }
        }

        public async Task<bool> SendBulkEmailAsync(IEnumerable<EmailMessage> messages, CancellationToken cancellationToken = default)
        {
            var tasks = messages.Select(msg => SendEmailAsync(msg, cancellationToken));
            var results = await Task.WhenAll(tasks);
            return results.All(r => r);
        }

        private SmtpClient CreateSmtpClient()
        {
            try
            {
                _logger.LogInformation("Criando cliente SMTP para {Host}:{Port}", _config.SmtpHost, _config.SmtpPort);

                var client = new SmtpClient(_config.SmtpHost, _config.SmtpPort)
                {
                    Credentials = new NetworkCredential(_config.Username, _config.Password),
                    EnableSsl = _config.EnableSsl,
                    Timeout = _config.TimeoutMs
                };

                _logger.LogInformation("Cliente SMTP criado");
                return client;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao criar cliente SMTP");
                throw;
            }
        }

        private MailMessage CreateMailMessage(EmailMessage message)
        {
            var mail = new MailMessage
            {
                From = new MailAddress(message.FromEmail ?? _config.DefaultFromEmail, message.FromName ?? _config.DefaultFromName),
                Subject = message.Subject,
                Body = message.Body,
                IsBodyHtml = message.IsHtml
            };

            mail.To.Add(new MailAddress(message.ToEmail, message.ToName ?? string.Empty));

            if (message.Attachments?.Any() == true)
            {
                foreach (var attachment in message.Attachments)
                {
                    var stream = new MemoryStream(attachment.Content);
                    mail.Attachments.Add(new Attachment(stream, attachment.FileName, attachment.ContentType));
                }
            }

            return mail;
        }

        private EmailTemplate GetEmailTemplate(string templateId) => templateId switch
        {
            "email-confirmation" => new EmailTemplate { Subject = "Confirme seu email", Body = GetEmailConfirmationTemplate() },
            "property-alert" => new EmailTemplate { Subject = "Nova Propriedade Encontrada!", Body = GetPropertyAlertTemplate() },
            "price-drop" => new EmailTemplate { Subject = "Preço Reduzido!", Body = GetPriceDropTemplate() },
            _ => throw new ArgumentException($"Template não encontrado: {templateId}")
        };

        private string ProcessTemplate(EmailTemplate template, object data)
        {
            var body = template.Body;
            var properties = data.GetType().GetProperties();
            foreach (var prop in properties)
            {
                var value = prop.GetValue(data)?.ToString() ?? string.Empty;
                body = body.Replace($"{{{{{prop.Name}}}}}", value);
            }
            return body;
        }

        private string GetEmailConfirmationTemplate() => @"<html><body><h1>Confirme seu email</h1><p>Olá {{UserName}},</p><p>Clique no link para confirmar: <a href='{{ConfirmationLink}}'>Confirmar Email</a></p></body></html>";
        private string GetPropertyAlertTemplate() => @"<h2>Nova Propriedade Encontrada!</h2><p>{{PropertyTitle}}</p><p>{{Location}} - {{Price}}</p><a href='{{PropertyUrl}}'>Ver Propriedade</a>";
        private string GetPriceDropTemplate() => @"<h2>Preço Reduzido!</h2><p>{{PropertyTitle}}</p><p>Antes: {{OldPrice}} Agora: {{NewPrice}}</p><p>Poupança: {{Savings}}</p><a href='{{PropertyUrl}}'>Ver Propriedade</a>";
    }

    public record EmailTemplate
    {
        public required string Subject { get; init; }
        public required string Body { get; init; }
    }
}