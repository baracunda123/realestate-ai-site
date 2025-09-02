import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Heart, MapPin, Bed, Bath, Square, Calendar } from 'lucide-react';
import { type Property } from '../types/property';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { memo } from 'react';

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
  isWhiteBackground?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (property: Property) => void;
}

function PropertyCardComponent({ property, onClick, isWhiteBackground = false, isFavorite = false, onToggleFavorite }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(price * 5.5); // Conversão mock para Real
  };

  const formatSqft = (sqft: number) => {
    return new Intl.NumberFormat('pt-BR').format(Math.round(sqft * 0.092903)); // Conversão para m²
  };

  const getPropertyTypeColor = (type: string) => {
    // Background branco para todos os badges com texto escuro e border colorida por tipo
    const colors = {
      house: 'bg-pure-white text-title border-burnt-soft',
      apartment: 'bg-pure-white text-title border-cocoa-soft', 
      condo: 'bg-pure-white text-title border-clay-medium',
      townhouse: 'bg-pure-white text-title border-clay-medium'
    };
    return colors[type as keyof typeof colors] || 'bg-pure-white text-title border-clay-medium';
  };

  const getPropertyTypeName = (type: string) => {
    const names = {
      house: 'Casa',
      apartment: 'Apartamento',
      condo: 'Condomínio',
      townhouse: 'Sobrado'
    };
    return names[type as keyof typeof names] || type;
  };

  // Função para obter a primeira imagem disponível ou usar fallback
  const getMainImage = () => {
    if (property.images && property.images.length > 0) {
      return property.images[0];
    }
    // Fallback para uma imagem padrão de propriedade
    return 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop';
  };

  return (
    <Card 
      className={`overflow-hidden hover:shadow-clay-medium transition-all duration-300 cursor-pointer group border border-clay-medium hover:border-clay-strong ${isWhiteBackground ? 'property-card-white' : ''}`} 
      style={isWhiteBackground ? { 
        backgroundColor: '#FFFFFF',
        background: '#FFFFFF'
      } : undefined}
      onClick={onClick}
    >
      <div className="relative">
        <ImageWithFallback
          src={getMainImage()}
          alt={property.title}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="absolute top-3 left-3">
          <Badge className={`${getPropertyTypeColor(property.propertyType)} font-medium border shadow-clay-soft`}>
            {getPropertyTypeName(property.propertyType)}
          </Badge>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={isFavorite}
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className="absolute top-3 right-3 h-9 w-9 p-0 bg-warm-white/95 hover:bg-warm-white shadow-clay-soft backdrop-blur-sm hover:scale-105 transition-all duration-200"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleFavorite) onToggleFavorite(property);
          }}
        >
          <Heart className={`h-4 w-4 transition-all duration-200 ${isFavorite ? 'text-burnt-primary' : 'text-clay-secondary'}`} />
        </Button>



        {/* Price overlay */}
        <div className="absolute bottom-3 right-3">
          <div className="bg-warm-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-clay-soft border border-clay-medium">
            <span className="text-sm font-semibold text-metric">
              {formatPrice(property.price)}
            </span>
          </div>
        </div>
      </div>
      
      <CardContent 
        className={`p-5 ${isWhiteBackground ? 'property-card-white' : ''}`}
        style={isWhiteBackground ? { 
          backgroundColor: '#FFFFFF',
          background: '#FFFFFF'
        } : undefined}
      >
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold line-clamp-1 text-lg text-title">{property.title}</h3>
            <div className="flex items-center text-sm text-clay-secondary mt-1">
              <MapPin className="h-3 w-3 mr-1 text-clay-secondary" />
              {property.location}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-1 text-clay-secondary">
              <div className="w-8 h-8 bg-pale-clay rounded-lg flex items-center justify-center">
                <Bed className="h-4 w-4 text-cocoa-primary" />
              </div>
              <div>
                <div className="font-medium text-title">{property.bedrooms}</div>
                <div className="text-xs text-clay-secondary">quartos</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 text-clay-secondary">
              <div className="w-8 h-8 bg-pale-clay rounded-lg flex items-center justify-center">
                <Bath className="h-4 w-4 text-cocoa-primary" />
              </div>
              <div>
                <div className="font-medium text-title">{property.bathrooms}</div>
                <div className="text-xs text-clay-secondary">banheiros</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 text-clay-secondary">
              <div className="w-8 h-8 bg-pale-clay rounded-lg flex items-center justify-center">
                <Square className="h-4 w-4 text-cocoa-primary" />
              </div>
              <div>
                <div className="font-medium text-title">{formatSqft(property.area)}</div>
                <div className="text-xs text-clay-secondary">m²</div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center text-xs text-clay-secondary">
              <Calendar className="h-3 w-3 mr-1" />
              Construído em {property.yearBuilt}
            </div>
            <div className="text-sm text-burnt-primary font-medium">
              R$ {Math.round(property.price * 5.5 / property.area)}/m²
            </div>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {property.features && property.features.slice(0, 3).map((feature, index) => (
              <Badge key={feature} className="text-xs border bg-pure-white text-title border-clay-medium">
                {feature}
              </Badge>
            ))}
            {property.features && property.features.length > 3 && (
              <Badge variant="outline" className="text-xs bg-pure-white text-clay-secondary border-clay-medium">
                +{property.features.length - 3} mais
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const PropertyCard = memo(PropertyCardComponent);
