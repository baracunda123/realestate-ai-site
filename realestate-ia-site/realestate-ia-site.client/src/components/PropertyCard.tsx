import React, { memo, useCallback, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Heart, MapPin, Bed, Bath, Square, TrendingDown, TrendingUp, Home, Building, Building2, Castle } from 'lucide-react';
import { type Property } from '../types/property';
import { trackPropertyView } from '../api/view-history.service';
import { logger } from '../utils/logger';
import { propertyWindowManager } from '../utils/propertyWindow';
import { getSourceColors, getFormattedSourceName } from '../utils/sourceColors';

interface PropertyCardProps {
  property: Property;
  isFavorite?: boolean;
  onToggleFavorite?: (property: Property) => void;
  onPropertyView?: (property: Property) => void;
}

function PropertyCardComponent({ 
  property, 
  isFavorite = false, 
  onToggleFavorite,
  onPropertyView
}: PropertyCardProps) {
  // Memoized formatters
  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  }, []);

  const formatArea = useCallback((area: number) => {
    return new Intl.NumberFormat('pt-PT').format(Math.round(area));
  }, []);

  // Memoized helper
  const getPropertyTypeName = useCallback((type: string) => {
    const names = {
      house: 'Casa',
      apartment: 'Apartamento',
      condo: 'Condomínio',
      townhouse: 'Sobrado'
    };
    return names[type as keyof typeof names] || type;
  }, []);

  const handleFavoriteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite(property);
  }, [onToggleFavorite, property]);


  const handleViewMoreClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      // 2. Callback para UI se necessário
      if (onPropertyView) {
        onPropertyView(property);
      }
      
      // 1. HÍBRIDO: Cache otimista + Sync servidor (uma só chamada)
      trackPropertyView(property).catch(() => 
        logger.warn('Falha ao registrar visualização', 'PROPERTY_CARD')
      );
      
    } catch (error) {
      logger.warn('Falha ao registrar visualização', 'PROPERTY_CARD');
    }
    
    // 3. Abrir link (reutiliza o mesmo separador externo)
    if (property.link) {
      propertyWindowManager.openProperty(property.link);
    }
  }, [property, onPropertyView]);

  // Safe calculations with null checks
  const pricePerSqm = property.price && property.area ? Math.round(property.price / property.area) : 0;
  const safePrice = property.price || 0;
  const safeArea = property.area || 0;
  const safeTitle = property.title || 'Propriedade';
  const safePropertyType = property.propertyType || property.type || 'apartment';

  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  // Get icon based on property type
  const getPropertyIcon = () => {
    const iconProps = { className: "h-20 w-20 text-muted-foreground/30", strokeWidth: 1 };
    const type = (property.propertyType || property.type || 'house').toLowerCase();
    
    if (type.includes('apartment') || type.includes('apartamento')) {
      return <Building {...iconProps} />;
    }
    if (type.includes('condo') || type.includes('condomínio') || type.includes('condominio')) {
      return <Building2 {...iconProps} />;
    }
    if (type.includes('townhouse') || type.includes('sobrado')) {
      return <Castle {...iconProps} />;
    }
    // Default: house/casa
    return <Home {...iconProps} />;
  };

  return (
    <Card 
      className="property-card relative overflow-hidden hover:shadow-strong transition-all duration-500 group border border-border hover:border-accent bg-card cursor-pointer rounded-2xl flex flex-col h-full transform hover:-translate-y-1"
      onClick={handleViewMoreClick}
    >
      {/* Image Container */}
      <div className="relative w-full h-48 bg-gradient-secondary overflow-hidden">
        {property.imageUrl && !imageError ? (
          <>
            <img 
              src={property.imageUrl} 
              alt={safeTitle}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
              onError={handleImageError}
              onLoad={handleImageLoad}
              loading="lazy"
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-secondary">
            {getPropertyIcon()}
          </div>
        )}
        
        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-background/20 to-transparent hidden group-hover:block" />
        
        {/* Favorite Button - Absolute Position */}
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={isFavorite}
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className="absolute top-3 right-3 h-10 w-10 p-0 bg-card/90 backdrop-blur-sm hover:bg-card rounded-full shadow-medium z-10 transition-all duration-300 hover:scale-110"
          onClick={(e) => {
            e.stopPropagation();
            handleFavoriteClick(e);
          }}
        >
          <Heart className={`h-5 w-5 transition-all duration-300 ${
            isFavorite ? 'text-red-500 fill-red-500 scale-110' : 'text-muted-foreground'
          }`} />
        </Button>

        {/* Price Change Badge - Top Left */}
        {property.hadRecentPriceChange && property.priceChangePercentage && (
          <div className="absolute top-3 left-3 z-10">
            <Badge className={`text-xs font-bold shadow-medium backdrop-blur-sm flex items-center gap-1 ${
              property.priceChangePercentage < 0 
                ? 'bg-success/95 text-white' 
                : 'bg-warning text-white'
            }`}>
              {property.priceChangePercentage < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              {property.priceChangePercentage < 0 ? '' : '+'}{property.priceChangePercentage}%
            </Badge>
          </div>
        )}

        {/* Property Type Badge - Bottom Left */}
        <div className="absolute bottom-3 left-3 z-10">
          <Badge className="bg-card/95 backdrop-blur-sm text-accent font-semibold text-xs shadow-medium">
            {getPropertyTypeName(safePropertyType)}
          </Badge>
        </div>

        {/* Source Badge - Bottom Right */}
        {property.siteName && (
          <div className="absolute bottom-3 right-3 z-10">
            <Badge className={`backdrop-blur-sm font-semibold text-xs shadow-medium border ${getSourceColors(property.siteName).bg} ${getSourceColors(property.siteName).text} ${getSourceColors(property.siteName).border}`}>
              {getFormattedSourceName(property.siteName)}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4 flex flex-col flex-1">
        {/* Price - Destaque Principal */}
        <div className="mb-3">
          <h3 className="font-bold text-2xl text-accent leading-tight">
            {formatPrice(safePrice)}
          </h3>
          {pricePerSqm > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {formatPrice(pricePerSqm)}/m²
            </p>
          )}
        </div>

        {/* Title */}
        <h4 className="font-semibold text-base text-foreground line-clamp-2 leading-snug mb-2 min-h-[2.5rem]">
          {safeTitle}
        </h4>

        {/* Location */}
        <div className="flex items-start gap-1.5 mb-4">
          <MapPin className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground line-clamp-2 leading-snug">
            {property.location}
          </p>
        </div>

        {/* Stats - Horizontal Layout */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
          <div className="flex items-center gap-1.5">
            <Bed className="h-4 w-4 text-accent stats-icon" />
            <span className="text-sm font-semibold text-foreground">{property.bedrooms}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className="h-4 w-4 text-accent stats-icon" />
            <span className="text-sm font-semibold text-foreground">{property.bathrooms}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Square className="h-4 w-4 text-accent stats-icon" />
            <span className="text-sm font-semibold text-foreground">{formatArea(safeArea)} m²</span>
          </div>
        </div>

        {/* Matched Features */}
        {property.matchedFeatures && property.matchedFeatures.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {property.matchedFeatures.slice(0, 2).map((feature, index) => (
              <span 
                key={`matched-${feature}-${index}`} 
                className="matched-feature text-xs text-accent bg-accent/10 px-2.5 py-1 rounded-full font-medium border border-accent/20"
              >
                ✓ {feature}
              </span>
            ))}
          </div>
        )}

        {/* Bottom Info - Pushed to bottom */}
        {property.yearBuilt && (
          <div className="mt-auto flex items-center justify-end text-xs text-muted-foreground">
            <span className="bg-muted px-2 py-1 rounded-full">{property.yearBuilt}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const PropertyCard = memo(PropertyCardComponent);