using System.ComponentModel.DataAnnotations;

namespace realestate_ia_site.Server.Application.Features.Auth.DTOs
{
    public class ExternalLoginRequest
    {
        [Required(ErrorMessage = "Token de acesso é obrigatório.")]
        public string AccessToken { get; set; } = string.Empty;

        [Required(ErrorMessage = "Provider é obrigatório.")]
        public string Provider { get; set; } = string.Empty;

        public string? DeviceFingerprint { get; set; }
    }
}
