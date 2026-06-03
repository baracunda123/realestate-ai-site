using System.ComponentModel.DataAnnotations;
using realestate_ia_site.Server.Application.Common.Validation;

namespace realestate_ia_site.Server.Application.Features.Auth.DTOs
{
    public class LoginRequest
    {
        [Required(ErrorMessage = "Email é obrigatório.")]
        [ConditionalEmail(ErrorMessage = "Email inválido.")]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Senha é obrigatória.")]
        public string Password { get; set; } = string.Empty;

        public bool RememberMe { get; set; } = false;

        public string? DeviceFingerprint { get; set; }
    }
}
