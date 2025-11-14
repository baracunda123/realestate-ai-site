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
        private readonly IWebHostEnvironment _environment;

        public EmailService(
            IOptions<EmailConfiguration> config, 
            ILogger<EmailService> logger,
            IWebHostEnvironment environment)
        {
            _config = config.Value;
            _logger = logger;
            _environment = environment;
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

                // Obter definição do template
                var template = GetEmailTemplate(templateId);
                
                // Carregar template do disco (SO faz cache de I/O)
                var templateBody = await LoadTemplateFromFileAsync(template.TemplateFile, cancellationToken);
                
                // Processar placeholders
                var body = ProcessTemplate(templateBody, templateData);

                var message = new EmailMessage
                {
                    ToEmail = recipientEmail,
                    Subject = template.Subject,
                    Body = body,
                    IsHtml = true
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

        private EmailTemplate GetEmailTemplate(string templateId)
        {
            return templateId switch
            {
                "email-confirmation" => new EmailTemplate 
                { 
                    Subject = "Confirme seu email - ResideAI", 
                    TemplateFile = "EmailConfirmation.html" 
                },
                "password-reset" => new EmailTemplate 
                { 
                    Subject = "Recuperação de Palavra-passe - ResideAI", 
                    TemplateFile = "PasswordReset.html" 
                },
                _ => throw new ArgumentException($"Template não encontrado: {templateId}")
            };
        }

        private string ProcessTemplate(string templateBody, object data)
        {
            var body = templateBody;
            
            // Substituir placeholders usando reflection
            var properties = data.GetType().GetProperties();
            foreach (var prop in properties)
            {
                var value = prop.GetValue(data)?.ToString() ?? string.Empty;
                body = body.Replace($"{{{{{prop.Name}}}}}", value);
            }
            
            // Substituir {{Year}} com ano atual
            body = body.Replace("{{Year}}", DateTime.Now.Year.ToString());
            
            return body;
        }

        /// <summary>
        /// Carrega template do disco (SO faz cache de I/O)
        /// </summary>
        private async Task<string> LoadTemplateFromFileAsync(string templateFileName, CancellationToken cancellationToken = default)
        {
            var templatesPath = Path.Combine(_environment.ContentRootPath, "Templates", "Emails");
            var templatePath = Path.Combine(templatesPath, templateFileName);

            if (!File.Exists(templatePath))
            {
                _logger.LogError("Template não encontrado: {Path}", templatePath);
                throw new FileNotFoundException($"Template não encontrado: {templateFileName}");
            }

            var content = await File.ReadAllTextAsync(templatePath, cancellationToken);
            
            _logger.LogDebug("Template {FileName} carregado ({Length} chars)", templateFileName, content.Length);
            
            return content;
        }
    }

    /// <summary>
    /// Definição simplificada de template (apenas metadados)
    /// </summary>
    public record EmailTemplate
    {
        public required string Subject { get; init; }
        public required string TemplateFile { get; init; }
    }
}
