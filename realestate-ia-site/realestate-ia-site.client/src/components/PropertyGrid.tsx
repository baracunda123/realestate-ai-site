import { useMemo } from 'react';
import { PropertyCard } from './PropertyCard';
import { type Property } from '../types/property';
import { Sparkles } from 'lucide-react';

interface PropertyGridProps {
  searchQuery: string;
  serverResults?: Property[];
  favorites?: Property[];
  onToggleFavorite?: (property: Property) => void;
  onCreatePriceAlert?: (property: Property) => void;
  hasAlertForPropertyId?: (propertyId: string) => boolean;
  onPropertyView?: (property: Property) => void;
}

export function PropertyGrid({ 
  searchQuery, 
  serverResults, 
  favorites = [], 
  onToggleFavorite,
  onCreatePriceAlert,
  hasAlertForPropertyId,
  onPropertyView
}: PropertyGridProps) {
  const properties = useMemo(() => {
    // Simply return server results as-is (AI already sorted them by relevance)
    return serverResults || [];
  }, [serverResults]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Results Header - responsive */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <h2 className="text-base sm:text-lg md:text-xl font-medium text-foreground">
            {properties.length} {properties.length === 1 ? 'Propriedade' : 'Propriedades'}
          </h2>
        </div>
      </div>
      
      {/* Properties List */}
      <div className="space-y-3 sm:space-y-4">
        {properties.map((property) => (
          <div key={property.id} className="relative">
            <PropertyCard
              property={property}
              isFavorite={favorites.some(f => f.id === property.id)}
              onToggleFavorite={onToggleFavorite}
              onCreatePriceAlert={onCreatePriceAlert}
              hasPriceAlert={hasAlertForPropertyId ? hasAlertForPropertyId(property.id) : false}
              onPropertyView={onPropertyView}
            />
          </div>
        ))}
      </div>
      
      {/* Empty state */}
      {properties.length === 0 && (
        <div className="text-center py-8 sm:py-12 px-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-pale-clay-light rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-cocoa-taupe" />
          </div>
          <p className="text-foreground mb-2 text-sm sm:text-base">Nenhuma propriedade encontrada</p>
          <p className="text-xs sm:text-sm text-muted-foreground px-4">Tente ajustar os seus filtros ou termos de procura</p>
          {searchQuery && (
            <p className="text-xs sm:text-sm text-burnt-peach mt-2 px-4">
              Experimente procurar por características específicas como localização ou tipo de imóvel
            </p>
          )}
        </div>
      )}
    </div>
  );
}
