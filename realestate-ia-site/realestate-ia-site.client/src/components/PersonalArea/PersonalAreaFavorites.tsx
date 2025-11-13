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
        title="Nenhum imóvel favoritado"
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {favorites.length === 1 ? '1 imóvel' : `${favorites.length} imóveis`}
          </p>
        </div>
      </div>

      {/* Properties List - Layout vertical consistente com a página principal */}
      <div className="space-y-3 sm:space-y-4">
        {favorites.map((property) => (
          <div key={property.id} className="relative">
            <PropertyCard
              property={property}
              onToggleFavorite={onToggleFavorite}
              onPropertyView={onPropertyView}
              isFavorite={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
}