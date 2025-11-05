using System.ComponentModel.DataAnnotations;

namespace realestate_ia_site.Server.Domain.Models
{
    public class RegisterRequest
    {
        [Required(ErrorMessage = "Nome completo é obrigatório.")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Nome deve ter entre 2 e 100 caracteres.")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email é obrigatório")]
        [EmailAddress(ErrorMessage = "Email inválido")]
        public string Email { get; set; } = string.Empty;

        [Phone(ErrorMessage = "Número de telefone inválido")]
        public string? PhoneNumber { get; set; }

        [Required(ErrorMessage = "Senha é obrigatória")]
        [StringLength(100, MinimumLength = 8, ErrorMessage = "Senha deve ter pelo menos 8 caracteres.")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]+$", 
            ErrorMessage = "Senha deve conter: 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirmação de senha é obrigatória.")]
        [Compare("Password", ErrorMessage = "Senhas não coincidem.")]
        public string ConfirmPassword { get; set; } = string.Empty;

        public bool AcceptTerms { get; set; } = false;
    }

    public class LoginRequest
    {
        [Required(ErrorMessage = "Email é obrigatório.")]
        [EmailAddress(ErrorMessage = "Email inválido.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Senha é obrigatória.")]
        public string Password { get; set; } = string.Empty;

        public bool RememberMe { get; set; } = false;
    }

    public class ChangePasswordRequest
    {
        [Required(ErrorMessage = "Senha atual é obrigatória.")]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Nova senha é obrigatória.")]
        [StringLength(100, MinimumLength = 8, ErrorMessage = "Senha deve ter pelo menos 8 caracteres.")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&.])[A-Za-z\d@$!%*?&.]+$", 
            ErrorMessage = "Senha deve conter: 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirmação de senha é obrigatória.")]
        [Compare("NewPassword", ErrorMessage = "Senhas não coincidem.")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }

    public class ExternalLoginRequest
    {
        [Required(ErrorMessage = "Token de acesso é obrigatório")]
        public string AccessToken { get; set; } = string.Empty;

        [Required(ErrorMessage = "Provider é obrigatório")]
        public string Provider { get; set; } = string.Empty;
    }

    public class AuthResult
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string[]? Errors { get; set; }
        public TokenResponse? Token { get; set; }
        public UserProfile? User { get; set; }

        public static AuthResult SuccessResult(TokenResponse token, UserProfile user, string message = "")
        {
            return new AuthResult
            {
                Success = true,
                Message = message,
                Token = token,
                User = user
            };
        }

        public static AuthResult ErrorResult(params string[] errors)
        {
            return new AuthResult
            {
                Success = false,
                Errors = errors
            };
        }
    }

    public class TokenResponse
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
        public string TokenType { get; set; } = "Bearer";
    }

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