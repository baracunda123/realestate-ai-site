using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace realestate_ia_site.Server.Domain.Entities
{
    [Table("user_login_sessions")]
    public class UserLoginSession
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();
        
        [Column("user_id")]
        [Required]
        public string UserId { get; set; } = string.Empty;
        
        [Column("session_token")]
        [Required]
        [StringLength(200)]
        public string SessionToken { get; set; } = string.Empty;
        
        [Column("ip_address")]
        [StringLength(45)]
        public string? IpAddress { get; set; }
        
        [Column("user_agent")]
        [StringLength(500)]
        public string? UserAgent { get; set; }
        
        [Column("device_info")]
        [StringLength(200)]
        public string? DeviceInfo { get; set; }
        
        [Column("login_at")]
        public DateTime LoginAt { get; set; } = DateTime.UtcNow;
        
        [Column("last_activity")]
        public DateTime LastActivity { get; set; } = DateTime.UtcNow;
        
        [Column("expires_at")]
        public DateTime ExpiresAt { get; set; }
        
        [Column("is_active")]
        public bool IsActive { get; set; } = true;
        
        [Column("logout_at")]
        public DateTime? LogoutAt { get; set; }
        
        // Navegação
        [ForeignKey("UserId")]
        public virtual User User { get; set; } = null!;
        
        public bool IsExpired => DateTime.UtcNow > ExpiresAt;
        public bool IsValid => IsActive && !IsExpired;
    }
}