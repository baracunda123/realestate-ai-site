import { ProfileLayout } from '../components/Profile/ProfileLayout';
import { PersonalAreaFavorites } from '../components/PersonalArea/PersonalAreaFavorites';
import type { Property } from '../types/property';
import type { User } from '../types/PersonalArea';

interface FavoritesPageProps {
  user: User;
  favorites: Property[];
  onToggleFavorite: (property: Property) => void;
  onPropertyView: (property: Property) => void;
  hasActiveSearch?: boolean;
  onNavigateToHome?: (reset?: boolean) => void;
}

export function FavoritesPage({ 
  favorites, 
  onToggleFavorite, 
  onPropertyView,
  hasActiveSearch,
  onNavigateToHome
}: FavoritesPageProps) {
  return (
    <ProfileLayout hasActiveSearch={hasActiveSearch} onNavigateToHome={onNavigateToHome}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-title">Favoritos</h1>
          <p className="text-muted-foreground mt-2">
            Propriedades que guardaste para consultar mais tarde
          </p>
        </div>

        {/* Favorites Content */}
        <PersonalAreaFavorites
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onPropertyView={onPropertyView}
        />
      </div>
    </ProfileLayout>
  );
}
