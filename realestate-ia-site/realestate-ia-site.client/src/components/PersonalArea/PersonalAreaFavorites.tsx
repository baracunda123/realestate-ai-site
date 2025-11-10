import { Heart } from 'lucide-react';
import type { Property } from '../../types/property';
import { PropertyCard } from '../PropertyCard';
import { EmptyState } from '../EmptyState';

interface PersonalAreaFavoritesProps {
  favorites: Property[];
  onToggleFavorite?: (property: Property) => void;
  onPropertyView?: (property: Property) => void;
}

export function PersonalAreaFavorites({
  favorites,
  onToggleFavorite,
  onPropertyView,
}: PersonalAreaFavoritesProps) {
  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Nenhum imóvel favorito"
        description="Explora imóveis e marca-os como favoritos para acompanhar facilmente."
        actionLabel="Explorar Imóveis"
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
          <h2 className="font-medium text-foreground">Os teus imóveis favoritos</h2>
          <p className="text-sm text-muted-foreground">
            {favorites.length} imóveis favoritos
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
            onPropertyView={onPropertyView}
            isFavorite={true}
          />
        ))}
      </div>
    </div>
  );
}