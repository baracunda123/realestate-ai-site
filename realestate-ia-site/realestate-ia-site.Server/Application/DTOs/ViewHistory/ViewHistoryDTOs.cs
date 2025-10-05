using System.ComponentModel.DataAnnotations;
using realestate_ia_site.Server.Application.DTOs.PropertySearch;

namespace realestate_ia_site.Server.Application.DTOs.ViewHistory
{
    // Request para registrar visualização
    public class TrackViewRequest
    {
        [Required]
        public string PropertyId { get; set; } = string.Empty;
    }

    // Response para registrar visualização
    public class TrackViewResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public int ViewCount { get; set; }
    }

    // Response para remover/ocultar do histórico
    public class RemoveFromHistoryResponse
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    // Item do histórico de visualizações - SIMPLIFICADO
    public class ViewHistoryItemDto
    {
        public string Id { get; set; } = string.Empty;
        public DateTime ViewedAt { get; set; }
        public PropertySearchDto Property { get; set; } = new();
    }

    // Response para listar histórico
    public class ViewHistoryResponse
    {
        public List<ViewHistoryItemDto> ViewHistory { get; set; } = new();
        public int TotalCount { get; set; }
        public int TotalViews { get; set; }
    }
}