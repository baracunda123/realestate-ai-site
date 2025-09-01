namespace realestate_ia_site.Server.DTOs
{
    public class PropertySearchDto
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string Type { get; set; }
        public string Location { get; set; }
        public string Address { get; set; }
        public decimal Price { get; set; }
        public int Bedrooms { get; set; }
        public int Bathrooms { get; set; }
        public double Area { get; set; }
        public string ImageUrl { get; set; }
        // Campos adicionais para funcionalidades futuras
        public string Link { get; set; }
        public DateTime? CreatedAt { get; set; }

        public static PropertySearchDto FromDomain(Domain.Entities.Property property)
        {
            return new PropertySearchDto
            {
                Id = property.Id,
                Title = property.Title ?? "N/A",
                Description = property.Description ?? "",
                Type = property.Type ?? "N/A",
                Location = property.City ?? "N/A",
                Address = property.Address ?? "",
                Price = property.Price ?? 0,
                Bedrooms = property.Bedrooms ?? 0,
                Bathrooms = property.Bathrooms ?? 0,
                Area = property.Area ?? 0,
                ImageUrl = property.ImageUrl,
                Link = property.Link,
                CreatedAt = property.CreatedAt
            };
        }
    }
}
