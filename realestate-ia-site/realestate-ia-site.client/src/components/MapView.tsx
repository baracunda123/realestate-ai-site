import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { MapPin, Layers, ZoomIn, ZoomOut, RotateCcw, Loader2, AlertCircle } from 'lucide-react';
import { type Property } from '../types/property';
import { getCoordinatesForProperties, type MapProperty, type MapDataResponse } from '../api/map.service';
import { logger } from '../utils/logger';
import { toast } from 'sonner';

interface MapViewProps {
  // Propriedades já carregadas dos resultados da pesquisa
  properties?: Property[];
  // Filtros atuais (para exibir contexto) - removido por não ser usado
  searchQuery?: string;
  // Handlers para interação
  onPropertySelect?: (property: Property) => void;
  onToggleFavorite?: (property: Property) => void;
  favorites?: Property[];
}

export function MapView({ 
  properties = [], 
  searchQuery,
  onPropertySelect,
  onToggleFavorite,
  favorites = []
}: MapViewProps) {
  const [mapData, setMapData] = useState<MapDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<MapProperty | null>(null);
  const [mapMode, setMapMode] = useState<'roadmap' | 'satellite'>('roadmap');

  // Carregar coordenadas quando as propriedades mudam
  useEffect(() => {
    if (!properties.length) {
      setMapData(null);
      setError(null);
      return;
    }

    const loadMapData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        logger.info(`Carregando coordenadas para ${properties.length} propriedades`, 'MAP_VIEW');
        
        const data = await getCoordinatesForProperties(properties);
        setMapData(data);

        if (data.totalWithCoordinates === 0) {
          setError('Não foi possível obter coordenadas para as propriedades.');
        } else if (data.totalWithCoordinates < data.totalProcessed) {
          toast.info(`Mapa carregado com ${data.totalWithCoordinates}/${data.totalProcessed} propriedades`, {
            description: 'Algumas propriedades não têm endereço suficiente para localização.'
          });
        } else {
          toast.success(`Mapa carregado com ${data.totalWithCoordinates} propriedades`);
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        logger.error(`Erro ao carregar mapa: ${errorMsg}`, 'MAP_VIEW', error as Error);
        setError('Erro ao carregar o mapa. Tente novamente.');
        toast.error('Erro ao carregar mapa');
      } finally {
        setIsLoading(false);
      }
    };

    loadMapData();
  }, [properties]);

  // Função para recarregar dados do mapa manualmente
  const reloadMapData = async () => {
    if (!properties.length) return;

    setIsLoading(true);
    setError(null);

    try {
      logger.info(`Recarregando coordenadas para ${properties.length} propriedades`, 'MAP_VIEW');
      
      const data = await getCoordinatesForProperties(properties);
      setMapData(data);

      if (data.totalWithCoordinates === 0) {
        setError('Não foi possível obter coordenadas para as propriedades.');
      } else {
        toast.success(`Mapa atualizado com ${data.totalWithCoordinates} propriedades`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      logger.error(`Erro ao recarregar mapa: ${errorMsg}`, 'MAP_VIEW', error as Error);
      setError('Erro ao recarregar o mapa. Tente novamente.');
      toast.error('Erro ao recarregar mapa');
    } finally {
      setIsLoading(false);
    }
  };

  // Propriedades agrupadas por preço para diferentes cores
  const priceGroups = useMemo(() => {
    if (!mapData?.properties) return { low: [], medium: [], high: [] };

    const prices = mapData.properties.map(p => p.price || 0).filter(p => p > 0);
    if (!prices.length) return { low: mapData.properties, medium: [], high: [] };

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    const lowThreshold = minPrice + range * 0.33;
    const highThreshold = minPrice + range * 0.67;

    return {
      low: mapData.properties.filter(p => !p.price || p.price <= lowThreshold),
      medium: mapData.properties.filter(p => p.price && p.price > lowThreshold && p.price <= highThreshold),
      high: mapData.properties.filter(p => p.price && p.price > highThreshold)
    };
  }, [mapData]);

  const handlePropertyClick = (mapProperty: MapProperty) => {
    setSelectedProperty(mapProperty);
    
    // Encontrar a propriedade original e chamar o handler
    const originalProperty = properties.find(p => p.id === mapProperty.id);
    if (originalProperty && onPropertySelect) {
      onPropertySelect(originalProperty);
    }
  };

  const handleToggleFavorite = (mapProperty: MapProperty) => {
    const originalProperty = properties.find(p => p.id === mapProperty.id);
    if (originalProperty && onToggleFavorite) {
      onToggleFavorite(originalProperty);
    }
  };

  const isPropertyFavorite = (propertyId: string) => {
    return favorites.some(f => f.id === propertyId);
  };

  // Calcular estatísticas do mapa
  const mapStats = useMemo(() => {
    if (!mapData?.properties) return null;

    const withPrice = mapData.properties.filter(p => p.price);
    const avgPrice = withPrice.length > 0 
      ? withPrice.reduce((sum, p) => sum + (p.price || 0), 0) / withPrice.length 
      : 0;

    return {
      total: mapData.properties.length,
      withPrice: withPrice.length,
      avgPrice: avgPrice,
      priceRange: withPrice.length > 0 ? {
        min: Math.min(...withPrice.map(p => p.price || 0)),
        max: Math.max(...withPrice.map(p => p.price || 0))
      } : null
    };
  }, [mapData]);

  if (!properties.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-medium">Vista de Mapa</h2>
        </div>

        <Card className="h-[600px] flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">Nenhuma propriedade para mostrar</p>
            <p>Execute uma pesquisa para ver propriedades no mapa</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium">Vista de Mapa</h2>
          {searchQuery && (
            <p className="text-sm text-muted-foreground mt-1">
              Resultados para: "<span className="font-medium">{searchQuery}</span>"
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant={mapMode === 'satellite' ? 'default' : 'outline'} 
            size="sm"
            onClick={() => setMapMode(mapMode === 'roadmap' ? 'satellite' : 'roadmap')}
          >
            <Layers className="h-4 w-4 mr-1" />
            {mapMode === 'roadmap' ? 'Satélite' : 'Mapa'}
          </Button>
          
          {mapData && (
            <Button variant="outline" size="sm" onClick={reloadMapData} disabled={isLoading}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
          )}
        </div>
      </div>

      {/* Map Container */}
      <Card className="relative h-[600px] overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Carregando coordenadas...</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
              <p className="text-lg font-medium mb-2">Erro ao carregar mapa</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button onClick={reloadMapData} variant="outline">
                Tentar novamente
              </Button>
            </div>
          </div>
        ) : (
          /* Mock Map Display */
          <div 
            className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50"
            style={{
              backgroundImage: mapMode === 'satellite' 
                ? `
                  radial-gradient(circle at 30% 40%, rgba(34, 139, 34, 0.3) 0%, transparent 50%),
                  radial-gradient(circle at 70% 60%, rgba(139, 69, 19, 0.2) 0%, transparent 50%),
                  linear-gradient(45deg, rgba(70, 130, 180, 0.1) 0%, rgba(34, 139, 34, 0.1) 100%)
                `
                : `
                  radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                  radial-gradient(circle at 80% 70%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
                  radial-gradient(circle at 40% 80%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)
                `
            }}
          >
            {/* Grid/Streets */}
            <svg className="absolute inset-0 w-full h-full opacity-20">
              <defs>
                <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#94a3b8" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Property Markers */}
            {mapData?.properties.map((property, index) => {
              const isFavorite = isPropertyFavorite(property.id);
              const isSelected = selectedProperty?.id === property.id;
              
              // Determinar cor baseada no preço
              let markerColor = 'bg-primary';
              if (priceGroups.low.includes(property)) markerColor = 'bg-green-500';
              if (priceGroups.medium.includes(property)) markerColor = 'bg-primary';
              if (priceGroups.high.includes(property)) markerColor = 'bg-red-500';

              return (
                <div
                  key={property.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  style={{
                    // Distribuir as propriedades pelo mapa de forma mais natural
                    left: `${15 + (index % 4) * 20 + Math.sin(index * 0.5) * 8}%`,
                    top: `${15 + Math.floor(index / 4) * 15 + Math.cos(index * 0.7) * 10}%`,
                  }}
                  onClick={() => handlePropertyClick(property)}
                >
                  {/* Price Marker */}
                  <div className={`
                    ${markerColor} text-white px-2 py-1 rounded-lg shadow-lg text-xs font-medium 
                    group-hover:scale-110 transition-all duration-200
                    ${isSelected ? 'ring-2 ring-white ring-offset-2 scale-110' : ''}
                    ${isFavorite ? 'ring-2 ring-yellow-400' : ''}
                  `}>
                    {property.formattedPrice}
                  </div>
                  
                  {/* Location Pin */}
                  <div className={`
                    w-3 h-3 ${markerColor} rounded-full mx-auto mt-1 
                    group-hover:scale-125 transition-all duration-200
                    ${isSelected ? 'scale-125' : ''}
                  `}></div>

                  {/* Property Info Popup */}
                  {isSelected && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-white rounded-lg shadow-xl border p-3 z-10">
                      <div className="text-sm">
                        <h3 className="font-semibold text-foreground mb-1">{property.title}</h3>
                        <p className="text-muted-foreground mb-2">
                          {[property.city, property.county].filter(Boolean).join(', ')}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {property.bedrooms ? `${property.bedrooms}Q` : ''} 
                            {property.bedrooms && property.bathrooms ? ' • ' : ''}
                            {property.bathrooms ? `${property.bathrooms}WC` : ''}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {property.accuracy === 'HIGH' ? '??' : property.accuracy === 'MEDIUM' ? '??' : '??'}
                          </span>
                        </div>

                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(property);
                            }}
                          >
                            {isFavorite ? '??' : '??'} {isFavorite ? 'Remover' : 'Favorito'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col space-y-2">
              <Button variant="secondary" size="sm" className="w-10 h-10 p-0">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" className="w-10 h-10 p-0">
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Legend */}
            <Card className="absolute bottom-4 left-4 p-3">
              <CardContent className="p-0 space-y-2">
                <div className="text-sm font-medium">Legenda de Preços</div>
                <div className="flex flex-col space-y-1 text-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Até {mapStats?.priceRange ? 
                      new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
                        .format(mapStats.priceRange.min + (mapStats.priceRange.max - mapStats.priceRange.min) * 0.33) 
                      : 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span>Preço médio</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Acima da média</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Map Stats */}
            <Card className="absolute top-4 left-4 p-3">
              <CardContent className="p-0">
                <div className="text-xs text-muted-foreground">Propriedades no mapa</div>
                <div className="text-sm font-medium">
                  {mapData?.totalWithCoordinates || 0} de {properties.length}
                </div>
                {mapStats?.avgPrice && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Preço médio: {new Intl.NumberFormat('pt-PT', { 
                      style: 'currency', 
                      currency: 'EUR', 
                      maximumFractionDigits: 0 
                    }).format(mapStats.avgPrice)}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        {mapData ? (
          `Clique nos marcadores para ver detalhes das propriedades. ${mapData.totalWithCoordinates} de ${mapData.totalProcessed} propriedades com localização.`
        ) : (
          'Carregue uma pesquisa para visualizar propriedades no mapa.'
        )}
      </div>
    </div>
  );
}