import { PersonalAreaFavorites } from '../components/PersonalArea/PersonalAreaFavorites';
import type { Property } from '../types/property';
import type { User } from '../types/PersonalArea';
import { Button } from '../components/ui/button';
import { ArrowLeft, Heart, Sparkles } from 'lucide-react';

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
              className="flex items-center gap-2 text-muted-foreground hover:text-accent hover:bg-accent/10 -ml-2 transition-all duration-300"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar aos Resultados</span>
            </Button>
          </div>
        )}

        <div className="space-y-8">
          {/* Page Header - Modern Design */}
          <div className="relative overflow-hidden rounded-2xl bg-card border border-border p-8 shadow-strong">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-accent/30 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-accent/20 backdrop-blur-sm rounded-xl">
                  <Heart className="h-8 w-8 text-accent fill-accent" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground flex items-center gap-2">
                    Favoritos
                    <Sparkles className="h-6 w-6 text-accent/80" />
                  </h1>
                </div>
              </div>
              <p className="text-foreground/90 text-lg max-w-2xl">
                Propriedades que guardaste para consultar mais tarde. Acompanha as tuas opções preferidas num só lugar.
              </p>
              
              {/* Stats Badge */}
              <div className="mt-4 inline-flex items-center gap-2 bg-accent/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Heart className="h-4 w-4 text-accent" />
                <span className="text-foreground font-semibold">
                  {favorites.length} {favorites.length === 1 ? 'imóvel guardado' : 'imóveis guardados'}
                </span>
              </div>
            </div>
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