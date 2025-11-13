import React, { memo, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Heart, MapPin, Bed, Bath, Square, Calendar, TrendingDown, TrendingUp } from 'lucide-react';
import { type Property } from '../types/property';
import { trackPropertyView } from '../api/view-history.service';
import { logger } from '../utils/logger';

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

  // Memoized helpers
  const getPropertyTypeColor = useCallback((type: string) => {
    // Background branco para todos os badges com texto escuro e border colorida por tipo
    const colors = {
      house: 'bg-pure-white text-title border-burnt-soft',
      apartment: 'bg-pure-white text-title border-cocoa-soft', 
      condo: 'bg-pure-white text-title border-clay-medium',
      townhouse: 'bg-pure-white text-title border-clay-medium'
    };
    return colors[type as keyof typeof colors] || 'bg-pure-white text-title border-clay-medium';
  }, []);

  const getPropertyTypeName = useCallback((type: string) => {
    const names = {
      house: 'Casa',
      apartment: 'Apartamento',
      condo: 'Condomínio',
      townhouse: 'Sobrado'
    };
    return names[type as keyof typeof names] || type;
  }, []);

  const getSiteNameColor = useCallback((siteName: string) => {
    // Cores específicas para cada site
    const colors = {
      'Idealista': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'Imovirtual': 'bg-blue-50 text-blue-700 border-blue-200',
      'Casa Sapo': 'bg-green-50 text-green-700 border-green-200',
      'Custo Justo': 'bg-orange-50 text-orange-700 border-orange-200',
      'OLX': 'bg-purple-50 text-purple-700 border-purple-200',
      'RE/MAX': 'bg-red-50 text-red-700 border-red-200',
      'ERA': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'Century 21': 'bg-amber-50 text-amber-700 border-amber-200'
    };
    return colors[siteName as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200';
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
    
    // 3. Abrir link
    if (property.link) {
      window.open(property.link, '_blank', 'noopener,noreferrer');
    }
  }, [property, onPropertyView]);

  // Safe calculations with null checks
  const pricePerSqm = property.price && property.area ? Math.round(property.price / property.area) : 0;
  const safePrice = property.price || 0;
  const safeArea = property.area || 0;
  const safeTitle = property.title || 'Propriedade';
  const safePropertyType = property.propertyType || property.type || 'apartment';

  return (
    <Card 
      className="property-card overflow-hidden hover:shadow-clay-medium transition-all duration-300 group border border-clay-medium hover:border-clay-strong bg-pure-white gpu-accelerate"
    >
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-2">
          {/* Header section with title, type, price and action buttons */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
            <div className="flex-1 w-full sm:w-auto min-w-0">
              <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                <Badge className={`property-badge ${getPropertyTypeColor(safePropertyType)} text-xs font-medium border shadow-clay-soft py-0.5 px-1.5`}>
                  {getPropertyTypeName(safePropertyType)}
                </Badge>
                {property.siteName && (
                  <Badge className={`property-badge ${getSiteNameColor(property.siteName)} text-xs font-medium border shadow-clay-soft py-0.5 px-1.5`}>
                    {property.siteName}
                  </Badge>
                )}
                {property.hadRecentPriceChange && property.priceChangePercentage && (
                  <Badge className={`property-badge text-xs font-semibold border shadow-sm py-0.5 px-1.5 flex items-center gap-1 ${
                    property.priceChangePercentage < 0 
                      ? 'bg-green-50 text-green-700 border-green-200' 
                      : 'bg-orange-50 text-orange-700 border-orange-200'
                  }`}>
                    {property.priceChangePercentage < 0 ? (
                      <>
                        <TrendingDown className="h-3 w-3" />
                        {property.priceChangePercentage}%
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-3 w-3" />
                        +{property.priceChangePercentage}%
                      </>
                    )}
                  </Badge>
                )}
                <div className="bg-warm-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-clay-soft border border-clay-medium transition-all duration-300 hover:transform hover:scale-105 hover:shadow-burnt-peach flex-shrink-0">
                  <span className="text-sm font-bold text-burnt-primary whitespace-nowrap">
                    {formatPrice(safePrice)}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-base text-title line-clamp-2 mb-1 mt-0.5">{safeTitle}</h3>
              <div className="flex items-center text-xs text-clay-secondary min-w-0">
                <MapPin className="property-info-icon h-3 w-3 mr-1 text-clay-secondary flex-shrink-0" />
                <span className="truncate">{property.location}</span>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-1 ml-0 sm:ml-2 flex-shrink-0">
              {/* Favorite Button */}
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={isFavorite}
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                className={`btn-favorite h-8 w-8 p-0 backdrop-blur-sm flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-burnt-peach/20 ${
                  isFavorite ? 'active' : ''
                }`}
                onClick={handleFavoriteClick}
              >
                <Heart className={`heart-icon h-4 w-4 transition-all duration-200 ${
                  isFavorite ? 'text-burnt-peach fill-current' : 'text-warm-taupe'
                }`} />
              </Button>
            </div>
          </div>
          
          {/* Property details and footer in one row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
            {/* Property details section */}
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="flex items-center space-x-1.5 text-clay-secondary">
                <div className="property-detail-icon w-6 h-6 bg-pale-clay rounded flex items-center justify-center">
                  <Bed className="icon h-3 w-3 text-cocoa-primary" />
                </div>
                <div>
                  <span className="font-semibold text-title text-sm">{property.bedrooms}</span>
                  <span className="text-xs text-clay-secondary ml-0.5">qts</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-1.5 text-clay-secondary">
                <div className="property-detail-icon w-6 h-6 bg-pale-clay rounded flex items-center justify-center">
                  <Bath className="icon h-3 w-3 text-cocoa-primary" />
                </div>
                <div>
                  <span className="font-semibold text-title text-sm">{property.bathrooms}</span>
                  <span className="text-xs text-clay-secondary ml-0.5">wc</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-1.5 text-clay-secondary">
                <div className="property-detail-icon w-6 h-6 bg-pale-clay rounded flex items-center justify-center">
                  <Square className="icon h-3 w-3 text-cocoa-primary" />
                </div>
                <div>
                  <span className="font-semibold text-title text-sm">{formatArea(safeArea)}</span>
                  <span className="text-xs text-clay-secondary ml-0.5">m²</span>
                </div>
              </div>
            </div>
            
            {/* Footer section */}
            <div className="flex items-center gap-2 sm:gap-3 text-xs text-clay-secondary w-full sm:w-auto justify-between sm:justify-end flex-wrap sm:flex-nowrap">
              <div className="flex items-center flex-shrink-0">
                <Calendar className="property-info-icon h-3 w-3 mr-1 flex-shrink-0" />
                <span className="whitespace-nowrap">{property.yearBuilt}</span>
              </div>
              <div className="text-sm text-burnt-primary font-semibold flex-shrink-0 whitespace-nowrap">
                €{pricePerSqm}/m²
              </div>
              {property.link && (
                <Button
                  variant="outline"
                  size="sm"
                  className="btn-ver-mais h-7 text-xs px-3 py-0 border-pale-clay-deep text-warm-taupe transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-burnt-peach/20 flex-shrink-0 whitespace-nowrap"
                  onClick={handleViewMoreClick}
                >
                  Ver mais
                </Button>
              )}
            </div>
          </div>
          
          {/* Features section - only if there are features */}
          {property.features && property.features.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {property.features.slice(0, 3).map((feature, index) => (
                <Badge key={`${feature}-${index}`} className="property-badge text-xs border bg-pure-white text-title border-clay-medium py-0.5 px-2 leading-tight">
                  {feature}
                </Badge>
              ))}
              {property.features.length > 3 && (
                <Badge variant="outline" className="property-badge text-xs bg-pure-white text-clay-secondary border-clay-medium py-0.5 px-2 leading-tight">
                  +{property.features.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const PropertyCard = memo(PropertyCardComponent);
