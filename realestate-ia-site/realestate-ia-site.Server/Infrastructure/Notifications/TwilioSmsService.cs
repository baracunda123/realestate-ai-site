using Microsoft.Extensions.Options;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using AppSmsService = realestate_ia_site.Server.Application.Notifications.Interfaces.ISmsService;
using realestate_ia_site.Server.Infrastructure.Configurations;

namespace realestate_ia_site.Server.Infrastructure.Notifications
{
    public class TwilioSmsService : AppSmsService
    {
        private readonly SmsConfiguration _config;
        private readonly ILogger<TwilioSmsService> _logger;

        public TwilioSmsService(IOptions<SmsConfiguration> config, ILogger<TwilioSmsService> logger)
        {
            _config = config.Value;
            _logger = logger;
            
            TwilioClient.Init(_config.AccountSid, _config.AuthToken);
        }

        public async Task<bool> SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default)
        {
            try
            {
                var msg = await MessageResource.CreateAsync(
                    body: message,
                    from: new Twilio.Types.PhoneNumber(_config.FromPhoneNumber),
                    to: new Twilio.Types.PhoneNumber(phoneNumber)
                );

                _logger.LogInformation("SMS enviado para {Phone}. SID: {Sid}", phoneNumber, msg.Sid);
                    
                return msg.Status != MessageResource.StatusEnum.Failed;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao enviar SMS para {Phone}", phoneNumber);
                return false;
            }
        }

        public async Task<bool> SendBulkSmsAsync(IEnumerable<(string phoneNumber, string message)> messages, CancellationToken cancellationToken = default)
        {
            var tasks = messages.Select(m => SendSmsAsync(m.phoneNumber, m.message, cancellationToken));
            var results = await Task.WhenAll(tasks);
            return results.All(r => r);
        }
    }

    // SmsConfiguration movido para Infrastructure/Configurations
}