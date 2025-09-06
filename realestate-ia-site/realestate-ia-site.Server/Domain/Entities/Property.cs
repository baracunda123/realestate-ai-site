using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using realestate_ia_site.Server.Domain.ValueObjects;
using realestate_ia_site.Server.Domain.Events;
using realestate_ia_site.Server.Domain.Models;
using AddressVO = realestate_ia_site.Server.Domain.ValueObjects.Address;

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
        
        // Persisted primitive for now; domain consumption can wrap into Money when needed
        [Column("price", TypeName = "decimal")]
        public decimal? Price { get; set; }
        
        // Raw address columns (legacy persistence) - will be composed into Value Object when read
        [Column("address")]
        public string? Address { get; set; }
        
        [Column("city")]
        public string? City { get; set; }
        
        [Column("state")]
        public string? State { get; set; }

        [Column("county")]
        public string? County { get; set; }

        [Column("civilParish")]
        public string? CivilParish { get; set; }

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

        // Helpers para Value Objects (não persistidos diretamente)
        public Money? GetMoneyPrice(string currency = "EUR") => Price.HasValue ? Money.From(Price.Value, currency) : null;
        public AddressVO ToAddressValueObject() => AddressVO.Create(Address, City, County, CivilParish, State, ZipCode, null); // remover país duplicado

        // Price change domain logic centralization
        public PriceChangeOutcome EvaluatePriceChange(decimal? originalPrice, string reason = "update")
        {
            if (!originalPrice.HasValue || !Price.HasValue) return PriceChangeOutcome.None;
            if (originalPrice.Value == Price.Value) return PriceChangeOutcome.None;

            var history = new PropertyPriceHistory
            {
                PropertyId = Id,
                OldPrice = originalPrice.Value,
                NewPrice = Price.Value,
                ChangeReason = reason
            };

            var @event = new PropertyPriceChangedEvent
            {
                PropertyId = Id,
                Property = this,
                OldPrice = originalPrice.Value,
                NewPrice = Price.Value
            };

            return new PriceChangeOutcome(history, @event);
        }
    }

    public record PriceChangeOutcome(PropertyPriceHistory? History, PropertyPriceChangedEvent? Event)
    {
        public static PriceChangeOutcome None => new(null, null);
        public bool HasChange => History is not null && Event is not null;
    }
}