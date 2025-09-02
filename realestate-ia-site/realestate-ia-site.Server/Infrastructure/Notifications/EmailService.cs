using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;
using realestate_ia_site.Server.Infrastructure.Notifications.Models;

namespace realestate_ia_site.Server.Infrastructure.Notifications
{
    public class EmailService : IEmailService
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
                using var client = CreateSmtpClient();
                using var mailMessage = CreateMailMessage(message);
                
                await client.SendMailAsync(mailMessage, cancellationToken);
                
                _logger.LogInformation("Email enviado com sucesso para {Email}", message.ToEmail);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao enviar email para {Email}", message.ToEmail);
                return false;
            }
        }

        public async Task<bool> SendTemplateEmailAsync(string templateId, string recipientEmail, object templateData, CancellationToken cancellationToken = default)
        {
            // Implementar templates de email aqui
            var template = GetEmailTemplate(templateId);
            var body = ProcessTemplate(template, templateData);
            
            var message = new EmailMessage
            {
                ToEmail = recipientEmail,
                Subject = template.Subject,
                Body = body
            };

            return await SendEmailAsync(message, cancellationToken);
        }

        public async Task<bool> SendBulkEmailAsync(IEnumerable<EmailMessage> messages, CancellationToken cancellationToken = default)
        {
            var tasks = messages.Select(msg => SendEmailAsync(msg, cancellationToken));
            var results = await Task.WhenAll(tasks);
            return results.All(r => r);
        }

        private SmtpClient CreateSmtpClient()
        {
            return new SmtpClient(_config.SmtpHost, _config.SmtpPort)
            {
                Credentials = new NetworkCredential(_config.Username, _config.Password),
                EnableSsl = _config.EnableSsl,
                Timeout = _config.TimeoutMs
            };
        }

        private MailMessage CreateMailMessage(EmailMessage message)
        {
            var mail = new MailMessage
            {
                From = new MailAddress(message.FromEmail ?? _config.DefaultFromEmail, 
                                     message.FromName ?? _config.DefaultFromName),
                Subject = message.Subject,
                Body = message.Body,
                IsBodyHtml = message.IsHtml
            };

            mail.To.Add(new MailAddress(message.ToEmail, message.ToName ?? ""));
            
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
            // Implementar carregamento de templates
            return templateId switch
            {
                "email-confirmation" => new EmailTemplate { Subject = "Confirme seu email", Body = GetEmailConfirmationTemplate() },
                "property-alert" => new EmailTemplate { Subject = "Nova Propriedade Encontrada!", Body = GetPropertyAlertTemplate() },
                "price-drop" => new EmailTemplate { Subject = "Preço Reduzido!", Body = GetPriceDropTemplate() },
                _ => throw new ArgumentException($"Template não encontrado: {templateId}")
            };
        }

        private string ProcessTemplate(EmailTemplate template, object data)
        {
            // Implementar processamento de template (pode usar Razor, Handlebars, etc.)
            var body = template.Body;
            
            // Substituição simples por agora
            var properties = data.GetType().GetProperties();
            foreach (var prop in properties)
            {
                var value = prop.GetValue(data)?.ToString() ?? "";
                body = body.Replace($"{{{{{prop.Name}}}}}", value);
            }
            
            return body;
        }

        private string GetEmailConfirmationTemplate()
        {
            return @"
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset='utf-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
                    <title>Confirmação de Email</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background-color: #f8f9fa; padding: 20px; border-radius: 5px 5px 0 0; }
                        .content { background-color: #ffffff; padding: 30px; border: 1px solid #e9ecef; }
                        .footer { background-color: #f8f9fa; padding: 15px; border-radius: 0 0 5px 5px; text-align: center; font-size: 12px; color: #6c757d; }
                        .btn { display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                        .btn:hover { background-color: #0056b3; }
                    </style>
                </head>
                <body>
                    <div class='container'>
                        <div class='header'>
                            <h1>Bem-vindo ao RealEstate IA!</h1>
                        </div>
                        <div class='content'>
                            <h2>Olá {{UserName}}!</h2>
                            <p>Obrigado por se registrar na nossa plataforma. Para ativar sua conta e começar a usar nossos serviços, você precisa confirmar seu endereço de email.</p>
                            
                            <p>Clique no botão abaixo para confirmar seu email:</p>
                            
                            <a href='{{ConfirmationLink}}' class='btn'>Confirmar Email</a>
                            
                            <p>Se o botão não funcionar, copie e cole o seguinte link no seu navegador:</p>
                            <p><a href='{{ConfirmationLink}}'>{{ConfirmationLink}}</a></p>
                            
                            <p><strong>Importante:</strong> Este link expira em 24 horas por motivos de segurança.</p>
                            
                            <p>Se você não criou uma conta conosco, ignore este email.</p>
                            
                            <p>Atenciosamente,<br>Equipe RealEstate IA</p>
                        </div>
                        <div class='footer'>
                            <p>Este é um email automático, não responda a esta mensagem.</p>
                            <p>&copy; 2024 RealEstate IA. Todos os direitos reservados.</p>
                        </div>
                    </div>
                </body>
                </html>
            ";
        }

        private string GetPropertyAlertTemplate()
        {
            return @"
                <h2>Nova Propriedade Encontrada!</h2>
                <p>Encontrámos uma nova propriedade que corresponde aos seus critérios:</p>
                <div>
                    <h3>{{PropertyTitle}}</h3>
                    <p><strong>Localização:</strong> {{Location}}</p>
                    <p><strong>Preço:</strong> {{Price}}</p>
                    <p><strong>Quartos:</strong> {{Bedrooms}}</p>
                    <a href='{{PropertyUrl}}'>Ver Propriedade</a>
                </div>
            ";
        }

        private string GetPriceDropTemplate()
        {
            return @"
                <h2>Preço Reduzido!</h2>
                <p>O preço de uma propriedade nos seus alertas foi reduzido:</p>
                <div>
                    <h3>{{PropertyTitle}}</h3>
                    <p><strong>Preço Anterior:</strong> {{OldPrice}}</p>
                    <p><strong>Novo Preço:</strong> {{NewPrice}}</p>
                    <p><strong>Poupança:</strong> {{Savings}}</p>
                    <a href='{{PropertyUrl}}'>Ver Propriedade</a>
                </div>
            ";
        }
    }

    public record EmailTemplate
    {
        public required string Subject { get; init; }
        public required string Body { get; init; }
    }

    public class EmailConfiguration
    {
        public required string SmtpHost { get; set; }
        public int SmtpPort { get; set; } = 587;
        public required string Username { get; set; }
        public required string Password { get; set; }
        public bool EnableSsl { get; set; } = true;
        public required string DefaultFromEmail { get; set; }
        public required string DefaultFromName { get; set; }
        public int TimeoutMs { get; set; } = 30000;
    }
}