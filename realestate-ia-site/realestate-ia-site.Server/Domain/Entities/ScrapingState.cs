using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace realestate_ia_site.Server.Domain.Entities
{
    [Table("scraping_states")]
    public class ScrapingState
    {
        [Key]
        [Column("id")]
        public string Id { get; set; } = string.Empty;
        
        [Required]
        [Column("site")]
        public string Site { get; set; } = string.Empty;
        
        [Column("currentPage")]
        public int CurrentPage { get; set; } = 1;
        
        [Column("createdAt")]
        public DateTime CreatedAt { get; set; }
        
        [Column("updatedAt")]
        public DateTime UpdatedAt { get; set; }
        
        [Required]
        [Column("location")]
        public string Location { get; set; } = string.Empty;
    }
} 