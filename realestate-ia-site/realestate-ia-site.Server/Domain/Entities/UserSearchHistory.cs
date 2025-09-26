using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace realestate_ia_site.Server.Domain.Entities
{
    [Table("user_search_history")]
    public class UserSearchHistory
    {
        [Key]
        [Column("id")]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Column("user_id")]
        public string? UserId { get; set; } // Nullable para pesquisas anónimas

        [Column("session_id")]
        [StringLength(100)]
        public string? SessionId { get; set; }

        [Column("search_query")]
        [Required]
        [StringLength(500)]
        public string SearchQuery { get; set; } = string.Empty;

        [Column("filters_json")]
        [StringLength(2000)]
        public string? FiltersJson { get; set; } // JSON dos filtros aplicados

        [Column("results_count")]
        public int ResultsCount { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("ip_address")]
        [StringLength(45)]
        public string? IpAddress { get; set; }

        // Navigation properties
        [ForeignKey("UserId")]
        public virtual User? User { get; set; }

        // Helper methods
        public Dictionary<string, object>? GetFilters()
        {
            if (string.IsNullOrEmpty(FiltersJson))
                return null;

            try
            {
                return System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(FiltersJson);
            }
            catch
            {
                return null;
            }
        }

        public void SetFilters(Dictionary<string, object>? filters)
        {
            if (filters == null)
            {
                FiltersJson = null;
                return;
            }

            try
            {
                FiltersJson = System.Text.Json.JsonSerializer.Serialize(filters);
            }
            catch
            {
                FiltersJson = null;
            }
        }
    }
}