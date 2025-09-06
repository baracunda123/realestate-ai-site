namespace realestate_ia_site.Server.Infrastructure.Configurations;

public class SmsConfiguration
{
    public required string AccountSid { get; set; }
    public required string AuthToken { get; set; }
    public required string FromPhoneNumber { get; set; }
}
