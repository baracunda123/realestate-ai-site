import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Heart, Crown } from 'lucide-react';
import type { Property } from '../../types/property';
import { PropertyCard } from '../PropertyCard';
import { EmptyState } from '../EmptyState';
import type { User } from '../../types/PersonalArea';
import { getCurrentLimits } from '../../utils/PersonalArea';

interface PersonalAreaFavoritesProps {
  user: User;
  favorites: Property[];
  onPropertySelect: (property: Property) => void;
  onOpenUpgradeModal?: () => void;
  onGoToHome: () => void;
}

export function PersonalAreaFavorites({ 
  user, 
  favorites, 
  onPropertySelect, 
  onOpenUpgradeModal, 
  onGoToHome 
}: PersonalAreaFavoritesProps) {
  const currentLimits = getCurrentLimits(user);

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon={Heart}
        title="Nenhuma propriedade favorita"
        description="Você ainda não favoritou nenhuma propriedade. Explore nossa seleção e marque suas favoritas!"
        actionLabel="Explorar Propriedades"
        onAction={onGoToHome}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with limits info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-foreground">Suas Propriedades Favoritas</h2>
          <p className="text-sm text-muted-foreground">
            {favorites.length} 
            {!user.isPremium && ` de ${currentLimits.maxFavorites}`} propriedades favoritadas
          </p>
        </div>

        {!user.isPremium && (
          <div className="flex flex-col items-end space-y-2">
            <Badge className="bg-burnt-peach-lighter text-burnt-peach-dark border-burnt-peach-light border px-3 py-1">
              {favorites.length}/{currentLimits.maxFavorites} usado
            </Badge>
            <Button 
              size="sm" 
              className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white border-0 shadow-clay-soft px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-clay-medium hover:scale-[1.02]"
              onClick={onOpenUpgradeModal}
            >
              <Crown className="h-3 w-3 mr-2" />
              Upgrade para Ilimitados
            </Button>
          </div>
        )}
      </div>

      {/* Favorites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {favorites.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onClick={() => onPropertySelect(property)}
          />
        ))}
      </div>

      {/* Limit reached warning for Free users */}
      {!user.isPremium && favorites.length >= currentLimits.maxFavorites && (
        <Card className="border border-burnt-peach-light bg-burnt-peach-lighter/10 shadow-clay-soft">
          <CardContent className="p-6 text-center">
            <Heart className="h-12 w-12 text-burnt-peach mx-auto mb-4" />
            <h3 className="font-medium text-foreground mb-2">Limite de Favoritos Atingido</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Você atingiu o limite de {currentLimits.maxFavorites} propriedades favoritas do plano Free. 
              Faça upgrade para favoritar propriedades ilimitadas!
            </p>
            <Button 
              className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white"
              onClick={onOpenUpgradeModal}
            >
              <Crown className="h-4 w-4 mr-2" />
              Fazer Upgrade
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}