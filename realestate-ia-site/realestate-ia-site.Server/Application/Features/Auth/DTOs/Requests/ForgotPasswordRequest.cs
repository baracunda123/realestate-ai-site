using System.ComponentModel.DataAnnotations;

namespace realestate_ia_site.Server.Application.Features.Auth.DTOs
{
    public class ForgotPasswordRequest
    {
        [Required(ErrorMessage = "Email é obrigatório")]
        [EmailAddress(ErrorMessage = "Email inválido")]
        public string Email { get; set; } = string.Empty;
    }
}
