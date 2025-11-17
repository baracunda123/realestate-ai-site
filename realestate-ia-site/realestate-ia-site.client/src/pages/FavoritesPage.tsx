import { PersonalAreaFavorites } from '../components/PersonalArea/PersonalAreaFavorites';
import type { Property } from '../types/property';
import type { User } from '../types/PersonalArea';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';

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
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Botão Voltar */}
        {hasActiveSearch && onNavigateToHome && (
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToHome(false)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar aos Resultados</span>
            </Button>
          </div>
        )}

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
      </div>
    </div>
  );
}
