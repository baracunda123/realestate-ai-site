using System.ComponentModel.DataAnnotations;
using realestate_ia_site.Server.Application.Common.Validation;

namespace realestate_ia_site.Server.Application.Features.Auth.DTOs
{
    public class RegisterRequest
    {
        [Required(ErrorMessage = "Nome completo é obrigatório.")]
        [ConditionalStringLength(100, MinimumLength = 2, ErrorMessage = "Nome deve ter entre 2 e 100 caracteres.")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email é obrigatório.")]
        [ConditionalEmail(ErrorMessage = "Email inválido")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Senha é obrigatória.")]
        [ConditionalStringLength(100, MinimumLength = 8, ErrorMessage = "Senha deve ter pelo menos 8 caracteres.")]
        [ConditionalRegularExpression(@"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?"":{}|<>_+=\-\[\]\\;'/])[A-Za-z\d!@#$%^&*(),.?"":{}|<>_+=\-\[\]\\;'/]+$",
            ErrorMessage = "Senha deve conter: 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Confirmação de senha é obrigatória.")]
        [Compare("Password", ErrorMessage = "Senhas não coincidem.")]
        public string ConfirmPassword { get; set; } = string.Empty;

        public bool AcceptTerms { get; set; } = false;
    }
}
