import { Heart } from 'lucide-react';
import type { Property } from '../../types/property';
import { PropertyCard } from '../PropertyCard';
import { EmptyState } from '../EmptyState';

interface PersonalAreaFavoritesProps {
  favorites: Property[];
  onToggleFavorite?: (property: Property) => void;
  onCreatePriceAlert?: (property: Property) => void;
  hasAlertForPropertyId?: (propertyId: string) => boolean;
  onPropertyView?: (property: Property) => void;
}

export function PersonalAreaFavorites({
  favorites,
  onToggleFavorite,
  onCreatePriceAlert,
  hasAlertForPropertyId,
  onPropertyView,
}: PersonalAreaFavoritesProps) {
  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Nenhuma propriedade favorita"
        description="Explore propriedades e marque suas favoritas para acompanhar facilmente."
        actionLabel="Explorar Propriedades"
        onAction={() => {
          // This should navigate to home/search
          window.location.href = '/';
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-foreground">Suas Propriedades Favoritas</h2>
          <p className="text-sm text-muted-foreground">
            {favorites.length} propriedades favoritadas
          </p>
        </div>
      </div>

      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
        {favorites.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onToggleFavorite={onToggleFavorite}
            onCreatePriceAlert={onCreatePriceAlert}
            onPropertyView={onPropertyView}
            isFavorite={true}
            hasPriceAlert={hasAlertForPropertyId ? hasAlertForPropertyId(property.id) : false}
          />
        ))}
      </div>
    </div>
  );
}