import React from 'react';
import { Heart } from 'lucide-react';
import type { Property } from '../../types/property';
import { PropertyCard } from '../PropertyCard';
import { EmptyState } from '../EmptyState';
import type { User } from '../../types/PersonalArea';

interface PersonalAreaFavoritesProps {
  user: User;
  favorites: Property[];
  onPropertySelect: (property: Property) => void;
  onToggleFavorite?: (property: Property) => void;
}

export function PersonalAreaFavorites({
  user,
  favorites,
  onPropertySelect,
  onToggleFavorite,
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favorites.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onClick={() => onPropertySelect(property)}
            onToggleFavorite={onToggleFavorite}
            isFavorite={true}
          />
        ))}
      </div>
    </div>
  );
}