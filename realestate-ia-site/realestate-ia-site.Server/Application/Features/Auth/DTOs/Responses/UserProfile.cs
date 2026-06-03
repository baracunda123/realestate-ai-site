namespace realestate_ia_site.Server.Application.Features.Auth.DTOs
{
    public class UserProfile
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? FullName { get; set; }
        public string? AvatarUrl { get; set; }
        public bool IsEmailVerified { get; set; }
        public int Credits { get; set; }
        public string? Subscription { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
