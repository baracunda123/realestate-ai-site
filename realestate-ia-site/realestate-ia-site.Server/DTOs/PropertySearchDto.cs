namespace realestate_ia_site.Server.DTOs
{
    public class PropertySearchDto
    {
        public string Id { get; set; }
        public string Type { get; set; }
        public string Location { get; set; }
        public decimal Price { get; set; }
        public int Bedrooms { get; set; }
        public List<string> Tags { get; set; }
        public string ImageUrl { get; set; }

        public static PropertySearchDto FromDomain(Domain.Entities.Property property)
        {
            return new PropertySearchDto
            {
                Id = property.Id,
                Type = property.Type ?? "N/A",
                Location = property.City ?? "N/A",
                Price = property.Price ?? 0,
                Bedrooms = property.Bedrooms ?? 0,
                ImageUrl = property.ImageUrl
            };
        }
    }
}
