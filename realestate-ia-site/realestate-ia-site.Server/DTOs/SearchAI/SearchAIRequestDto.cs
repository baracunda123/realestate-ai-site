using System.ComponentModel.DataAnnotations;

namespace realestate_ia_site.Server.DTOs.SearchAI
{
    public sealed class SearchAIRequestDto
    {
        [Required(ErrorMessage = "Query é obrigatória")]
        [StringLength(500, ErrorMessage = "Query não pode exceder 500 caracteres")]
        public string? Query { get; set; }
        
        public string SessionId { get; set; } = string.Empty;
    }
}
