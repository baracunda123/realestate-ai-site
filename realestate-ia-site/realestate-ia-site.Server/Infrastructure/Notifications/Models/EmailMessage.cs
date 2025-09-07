namespace realestate_ia_site.Server.Infrastructure.Notifications.Models
{
    public record EmailMessage
    {
        public required string ToEmail { get; init; }
        public string? ToName { get; init; }
        public required string Subject { get; init; }
        public required string Body { get; init; }
        public bool IsHtml { get; init; } = true;
        public string? FromEmail { get; init; }
        public string? FromName { get; init; }
        public List<EmailAttachment>? Attachments { get; init; }
    }

    public record EmailAttachment
    {
        public required string FileName { get; init; }
        public required byte[] Content { get; init; }
        public string ContentType { get; init; } = "application/octet-stream";
    }
}