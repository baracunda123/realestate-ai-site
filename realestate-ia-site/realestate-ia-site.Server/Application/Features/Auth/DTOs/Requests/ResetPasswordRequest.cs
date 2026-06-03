using System.ComponentModel.DataAnnotations;

namespace realestate_ia_site.Server.Application.Features.Auth.DTOs
{
    public class ResetPasswordRequest
    {
        [Required(ErrorMessage = "Token é obrigatório")]
        public string Token { get; set; } = string.Empty;

        [Required(ErrorMessage = "Palavra-passe é obrigatória")]
        [StringLength(100, MinimumLength = 8, ErrorMessage = "A palavra-passe deve ter entre 8 e 100 caracteres")]
        [RegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?"":{}|<>_+=\-\[\]\\;'/])[A-Za-z\d!@#$%^&*(),.?"":{}|<>_+=\-\[\]\\;'/]+$",
            ErrorMessage = "Senha deve conter: 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirmação de palavra-passe é obrigatória")]
        [Compare("Password", ErrorMessage = "As palavras-passe não coincidem")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
