using Microsoft.Extensions.Options;
using Twilio;
using Twilio.Rest.Api.V2010.Account;

namespace realestate_ia_site.Server.Infrastructure.Notifications
{
    public class TwilioSmsService : ISmsService
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
                var messageResource = await MessageResource.CreateAsync(
                    body: message,
                    from: new Twilio.Types.PhoneNumber(_config.FromPhoneNumber),
                    to: new Twilio.Types.PhoneNumber(phoneNumber)
                );

                _logger.LogInformation("SMS enviado com sucesso para {PhoneNumber}. SID: {MessageSid}", 
                    phoneNumber, messageResource.Sid);
                    
                return messageResource.Status != MessageResource.StatusEnum.Failed;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Erro ao enviar SMS para {PhoneNumber}", phoneNumber);
                return false;
            }
        }

        public async Task<bool> SendBulkSmsAsync(IEnumerable<(string phoneNumber, string message)> messages, CancellationToken cancellationToken = default)
        {
            var tasks = messages.Select(msg => SendSmsAsync(msg.phoneNumber, msg.message, cancellationToken));
            var results = await Task.WhenAll(tasks);
            return results.All(r => r);
        }
    }

    public class SmsConfiguration
    {
        public required string AccountSid { get; set; }
        public required string AuthToken { get; set; }
        public required string FromPhoneNumber { get; set; }
    }
}