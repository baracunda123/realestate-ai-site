using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

namespace realestate_ia_site.Server.Domain.Entities
{
    [Table("users")]
    public class User : IdentityUser
    {
        [Key]
        [Column("id")]
        public override string Id { get; set; } = Guid.NewGuid().ToString();

        [Column("avatar_url")]
        public string? AvatarUrl { get; set; }

        [Column("user_id")]
        public string? UserId { get; set; }

        [Column("token_identifier")]
        [Required]
        public string TokenIdentifier { get; set; } = Guid.NewGuid().ToString();

        [Column("subscription")]
        public string? Subscription { get; set; }

        [Column("credits")]
        public string? Credits { get; set; }

        [Column("image")]
        public string? Image { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }

        [Column("email")]
        public override string? Email { get; set; }

        [Column("name")]
        public string? Name { get; set; }

        [Column("full_name")]
        public string? FullName { get; set; }

        // Propriedades que agora serão mapeadas para a base de dados
        [Column("refresh_token")]
        public string? RefreshToken { get; set; }
        
        [Column("refresh_token_expires")]
        public DateTime? RefreshTokenExpires { get; set; }

        // Propriedades adicionais que não estão no schema mas podem ser úteis
        // Estas não serão mapeadas para colunas específicas
        [NotMapped]
        public DateTime? LastLoginAt { get; set; }

        [NotMapped]
        public string? LastLoginIp { get; set; }

        [NotMapped]
        public DateTime? PasswordChangedAt { get; set; }

        [NotMapped]
        public DateTime? EmailVerifiedAt { get; set; }

        [NotMapped]
        public AccountStatus AccountStatus { get; set; } = AccountStatus.Active;

        [NotMapped]
        public int FailedLoginAttempts { get; set; } = 0;

        [NotMapped]
        public DateTime? LockedUntil { get; set; }

        // Navegação
        public virtual ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
        public virtual ICollection<UserLoginSession> LoginSessions { get; set; } = new List<UserLoginSession>();
        
        // Métodos auxiliares
        [NotMapped]
        public bool IsLocked => LockedUntil.HasValue && LockedUntil > DateTime.UtcNow;
        
        [NotMapped]
        public bool IsEmailVerified => EmailVerifiedAt.HasValue;
        
        [NotMapped]
        public bool IsActive => AccountStatus == AccountStatus.Active && !IsLocked;
        
        public void UpdateLastLogin(string? ipAddress)
        {
            LastLoginAt = DateTime.UtcNow;
            LastLoginIp = ipAddress;
            FailedLoginAttempts = 0;
            LockedUntil = null;
            UpdatedAt = DateTime.UtcNow;
        }
        
        public void IncrementFailedLogin()
        {
            FailedLoginAttempts++;
            if (FailedLoginAttempts >= 5)
            {
                LockedUntil = DateTime.UtcNow.AddMinutes(15);
            }
            UpdatedAt = DateTime.UtcNow;
        }
        
        public void UnlockAccount()
        {
            FailedLoginAttempts = 0;
            LockedUntil = null;
            UpdatedAt = DateTime.UtcNow;
        }

        // Conversão de credits para int quando necessário
        [NotMapped]
        public int CreditsAsInt 
        { 
            get => int.TryParse(Credits, out var result) ? result : 0;
            set => Credits = value.ToString();
        }
    }

    public enum AccountStatus
    {
        Active = 1,
        Suspended = 2,
        Deactivated = 3,
        PendingVerification = 4
    }
}