import { ProfileLayout } from '../components/Profile/ProfileLayout';
import { PersonalAreaFavorites } from '../components/PersonalArea/PersonalAreaFavorites';
import { DashboardRecommendations } from '../components/Recommendations/DashboardRecommendations';
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
        </div>

        {/* Favorites Content */}
        <PersonalAreaFavorites
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          onPropertyView={onPropertyView}
        />

        {/* Recommendations Section - Always show */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-title mb-4">
            {favorites.length > 0 ? 'Pode também gostar' : 'Recomendações para ti'}
          </h2>
          <DashboardRecommendations limit={6} />
        </div>
      </div>
    </ProfileLayout>
  );
}
