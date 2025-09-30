using System.ComponentModel.DataAnnotations;

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

    // Item do histórico de visualizações - SIMPLIFICADO
    public class ViewHistoryItemDto
    {
        public string Id { get; set; } = string.Empty;
        public string PropertyId { get; set; } = string.Empty;
        public DateTime ViewedAt { get; set; }
        public int ViewCount { get; set; }

        // Apenas título da propriedade via FK (mínimo necessário para UI)
        public string PropertyTitle { get; set; } = string.Empty;
    }

    // Response para listar histórico - SIMPLIFICADO
    public class ViewHistoryResponse
    {
        public List<ViewHistoryItemDto> ViewHistory { get; set; } = new();
        public int TotalCount { get; set; }
        public int TotalViews { get; set; }
    }

    // Response básico para estatísticas - SIMPLIFICADO
    public class ViewHistoryStatsResponse
    {
        public int TotalViews { get; set; }
        public int UniqueProperties { get; set; }
        public MostViewedPropertyDto? MostViewedProperty { get; set; }
        public List<RecentActivityDto> RecentActivity { get; set; } = new();
    }

    public class MostViewedPropertyDto
    {
        public string PropertyId { get; set; } = string.Empty;
        public string PropertyTitle { get; set; } = string.Empty;
        public int ViewCount { get; set; }
    }

    public class RecentActivityDto
    {
        public string PropertyId { get; set; } = string.Empty;
        public string PropertyTitle { get; set; } = string.Empty;
        public DateTime ViewedAt { get; set; }
        public int ViewCount { get; set; }
    }
}