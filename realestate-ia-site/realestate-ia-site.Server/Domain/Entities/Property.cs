using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace realestate_ia_site.Server.Domain.Entities
{
    [Table("properties")]
    public class Property
    {
        [Key]
        [Column("id")] // Especifica o nome exato da coluna na BD
        public string Id { get; set; } = string.Empty;
        
        [Column("title")]
        public string? Title { get; set; }
        
        [Column("description")]
        public string? Description { get; set; }
        
        [Column("type")]
        public string? Type { get; set; }
        
        [Column("price", TypeName = "decimal")]
        public decimal? Price { get; set; }
        
        [Column("address")]
        public string? Address { get; set; }
        
        [Column("city")]
        public string? City { get; set; }
        
        [Column("state")]
        public string? State { get; set; }
        
        [Column("zipCode")]
        public string? ZipCode { get; set; }
        
        [Column("area")]
        public double? Area { get; set; }
        
        [Column("usableArea")]
        public double? UsableArea { get; set; }
        
        [Column("bedrooms")]
        public int? Bedrooms { get; set; }
        
        [Column("bathrooms")]
        public int? Bathrooms { get; set; }
        
        [Column("garage", TypeName = "boolean")]
        public bool Garage { get; set; } = false;
        
        [Column("imageUrl")]
        public string? ImageUrl { get; set; }
        
        [Column("link")]
        public string? Link { get; set; }
        
        [Column("createdAt")]
        public DateTime CreatedAt { get; set; }
        
        [Column("updatedAt")]
        public DateTime UpdatedAt { get; set; }
    }
}