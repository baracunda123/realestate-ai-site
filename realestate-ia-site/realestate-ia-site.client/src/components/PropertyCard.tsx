import React, { memo, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Heart, MapPin, Bed, Bath, Square, Calendar, Bell } from 'lucide-react';
import { type Property } from '../types/property';

interface PropertyCardProps {
  property: Property;
  isFavorite?: boolean;
  onToggleFavorite?: (property: Property) => void;
  onCreatePriceAlert?: (property: Property) => void;
  hasPriceAlert?: boolean;
}

function PropertyCardComponent({ 
  property, 
  isFavorite = false, 
  onToggleFavorite,
  onCreatePriceAlert,
  hasPriceAlert = false
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

  const handlePriceAlertClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCreatePriceAlert) onCreatePriceAlert(property);
  }, [onCreatePriceAlert, property]);

  // Safe calculations with null checks
  const pricePerSqm = property.price && property.area ? Math.round(property.price / property.area) : 0;
  const safePrice = property.price || 0;
  const safeArea = property.area || 0;
  const safeTitle = property.title || 'Propriedade';
  const safePropertyType = property.propertyType || property.type || 'apartment';

  return (
    <Card 
      className="property-card overflow-hidden hover:shadow-clay-medium transition-all duration-300 group border border-clay-medium hover:border-clay-strong bg-pure-white"
    >
      <CardContent className="p-3">
        <div className="space-y-2">
          {/* Header section with title, type, price and action buttons */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge className={`property-badge ${getPropertyTypeColor(safePropertyType)} text-xs font-medium border shadow-clay-soft py-0.5 px-1.5`}>
                  {getPropertyTypeName(safePropertyType)}
                </Badge>
                {property.siteName && (
                  <Badge className={`property-badge ${getSiteNameColor(property.siteName)} text-xs font-medium border shadow-clay-soft py-0.5 px-1.5`}>
                    {property.siteName}
                  </Badge>
                )}
                <div className="bg-warm-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-clay-soft border border-clay-medium transition-all duration-300 hover:transform hover:scale-105 hover:shadow-burnt-peach">
                  <span className="text-sm font-bold text-burnt-primary">
                    {formatPrice(safePrice)}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-base text-title line-clamp-1 mb-0.5">{safeTitle}</h3>
              <div className="flex items-center text-xs text-clay-secondary">
                <MapPin className="property-info-icon h-3 w-3 mr-1 text-clay-secondary" />
                {property.location}
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center space-x-1 ml-2">
              {/* Price Alert Button */}
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={hasPriceAlert}
                aria-label={hasPriceAlert ? 'Remover alerta de preço' : 'Criar alerta de redução de preço'}
                className={`btn-price-alert h-7 w-7 p-0 backdrop-blur-sm flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-burnt-peach/20 ${
                  hasPriceAlert ? 'active' : ''
                }`}
                onClick={handlePriceAlertClick}
              >
                <Bell className={`bell-icon h-3.5 w-3.5 transition-all duration-200 ${
                  hasPriceAlert ? 'text-burnt-peach fill-current' : 'text-warm-taupe'
                }`} />
              </Button>

              {/* Favorite Button */}
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={isFavorite}
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                className={`btn-favorite h-7 w-7 p-0 backdrop-blur-sm flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-burnt-peach/20 ${
                  isFavorite ? 'active' : ''
                }`}
                onClick={handleFavoriteClick}
              >
                <Heart className={`heart-icon h-3.5 w-3.5 transition-all duration-200 ${
                  isFavorite ? 'text-burnt-peach fill-current' : 'text-warm-taupe'
                }`} />
              </Button>
            </div>
          </div>
          
          {/* Property details and footer in one row */}
          <div className="flex items-center justify-between">
            {/* Property details section */}
            <div className="flex items-center gap-4">
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
            <div className="flex items-center gap-3 text-xs text-clay-secondary">
              <div className="flex items-center">
                <Calendar className="property-info-icon h-3 w-3 mr-1" />
                {property.yearBuilt}
              </div>
              <div className="text-sm text-burnt-primary font-semibold">
                €{pricePerSqm}/m²
              </div>
              {property.link && (
                <Button
                  variant="outline"
                  size="sm"
                  className="btn-ver-mais h-6 text-xs px-2 py-0 border-pale-clay-deep text-warm-taupe transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-burnt-peach/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (property.link) {
                      window.open(property.link, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  Ver mais
                </Button>
              )}
            </div>
          </div>
          
          {/* Features section - only if there are features */}
          {property.features && property.features.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {property.features.slice(0, 3).map((feature, index) => (
                <Badge key={`${feature}-${index}`} className="property-badge text-xs border bg-pure-white text-title border-clay-medium py-0 px-1.5 leading-tight">
                  {feature}
                </Badge>
              ))}
              {property.features.length > 3 && (
                <Badge variant="outline" className="property-badge text-xs bg-pure-white text-clay-secondary border-clay-medium py-0 px-1.5 leading-tight">
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
