namespace realestate_ia_site.Server.Infrastructure.Configurations;

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
