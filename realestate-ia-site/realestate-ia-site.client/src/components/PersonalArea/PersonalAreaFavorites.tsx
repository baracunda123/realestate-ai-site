import { Heart, TrendingDown, MapPin, Euro } from 'lucide-react';
import type { Property } from '../../types/property';
import { PropertyCard } from '../PropertyCard';
import { EmptyState } from '../EmptyState';
import { Card } from '../ui/card';

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
  // Calculate statistics
  const totalProperties = favorites.length;
  const averagePrice = favorites.length > 0 
    ? Math.round(favorites.reduce((sum, p) => sum + (p.price || 0), 0) / favorites.length)
    : 0;
  const propertiesWithPriceChange = favorites.filter(p => p.hadRecentPriceChange).length;
  const uniqueLocations = new Set(favorites.map(p => p.location?.split(',')[0]?.trim())).size;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Nenhum imóvel favoritado"
        description="Explora imóveis e marca-os como favoritos para acompanhar facilmente."
        actionLabel="Explorar Imóveis"
        onAction={() => {
          window.location.href = '/';
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Properties */}
        <Card className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20 hover:shadow-medium transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent/20 rounded-xl">
              <Heart className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total</p>
              <p className="text-2xl font-bold text-accent">{totalProperties}</p>
            </div>
          </div>
        </Card>

        {/* Average Price */}
        <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 hover:shadow-medium transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 rounded-xl">
              <Euro className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Preço Médio</p>
              <p className="text-lg font-bold text-foreground">{formatPrice(averagePrice)}</p>
            </div>
          </div>
        </Card>

        {/* Price Changes */}
        <Card className="p-4 bg-gradient-to-br from-success/10 to-success/5 border-success/20 hover:shadow-medium transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-success/20 rounded-xl">
              <TrendingDown className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Alterações</p>
              <p className="text-2xl font-bold text-success">{propertiesWithPriceChange}</p>
            </div>
          </div>
        </Card>

        {/* Locations */}
        <Card className="p-4 bg-gradient-to-br from-info/10 to-info/5 border-info/20 hover:shadow-medium transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-info/20 rounded-xl">
              <MapPin className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Localizações</p>
              <p className="text-2xl font-bold text-foreground">{uniqueLocations}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Properties Grid - Responsive Layout */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Todos os Favoritos</h3>
          <p className="text-sm text-muted-foreground">
            {favorites.length === 1 ? '1 imóvel' : `${favorites.length} imóveis`}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {favorites.map((property, index) => (
            <div 
              key={property.id} 
              className="animate-slide-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
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
    </div>
  );
}