using System.ComponentModel.DataAnnotations;
using realestate_ia_site.Server.Application.Common.Validation;

namespace realestate_ia_site.Server.Application.Features.Auth.DTOs
{
    public class ChangePasswordRequest
    {
        [Required(ErrorMessage = "Senha atual é obrigatória.")]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Nova senha é obrigatória.")]
        [ConditionalStringLength(100, MinimumLength = 8, ErrorMessage = "Senha deve ter pelo menos 8 caracteres.")]
        [ConditionalRegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?"":{}|<>_+=\-\[\]\\;'/])[A-Za-z\d!@#$%^&*(),.?"":{}|<>_+=\-\[\]\\;'/]+$",
            ErrorMessage = "Senha deve conter: 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.")]
        public string NewPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirmação de senha é obrigatória.")]
        [Compare("NewPassword", ErrorMessage = "Senhas não coincidem.")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}
