import { useMemo } from 'react';
import { PropertyCard } from './PropertyCard';
import { type Property } from '../types/property';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';

interface PropertyGridProps {
  searchQuery: string;
  serverResults?: Property[];
  favorites?: Property[];
  onToggleFavorite?: (property: Property) => void;
  onPropertyView?: (property: Property) => void;
  onBackToChat?: () => void;
  showBackButton?: boolean;
}

export function PropertyGrid({ 
  searchQuery, 
  serverResults, 
  favorites = [], 
  onToggleFavorite,
  onPropertyView,
  onBackToChat,
  showBackButton = false
}: PropertyGridProps) {
  const properties = useMemo(() => {
    // Simply return server results as-is (AI already sorted them by relevance)
    return serverResults || [];
  }, [serverResults]);

  return (
    <div className="space-y-4 sm:space-y-6 relative">
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{
             backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255, 140, 97, 0.4) 0%, transparent 50%),
                              radial-gradient(circle at 80% 70%, rgba(167, 139, 124, 0.3) 0%, transparent 50%),
                              radial-gradient(circle at 50% 50%, rgba(245, 122, 77, 0.2) 0%, transparent 50%)`,
             backgroundSize: '100% 100%'
           }} />
      
      {/* Results Header - responsive */}
      <div className="flex flex-col gap-3 relative z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-3">
            {/* Botão voltar - apenas mobile/tablet */}
            {showBackButton && onBackToChat && (
              <Button
                onClick={onBackToChat}
                size="sm"
                variant="ghost"
                className="lg:hidden h-9 px-3 text-accent hover:text-accent/90 hover:bg-accent/10"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Chat
              </Button>
            )}
            <h2 className="text-base sm:text-lg md:text-xl font-medium text-foreground">
              {properties.length} {properties.length === 1 ? 'Imóvel encontrado' : 'Imóveis encontrados'}
            </h2>
          </div>
        </div>
      </div>
      
      {/* Properties Grid - 3 por linha em desktop para melhor visualização */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 relative z-10">
        {properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            isFavorite={favorites.some(f => f.id === property.id)}
            onToggleFavorite={onToggleFavorite}
            onPropertyView={onPropertyView}
          />
        ))}
      </div>
      
      {/* Empty state */}
      {properties.length === 0 && (
        <div className="text-center py-8 sm:py-12 px-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
          </div>
          <p className="text-foreground mb-2 text-sm sm:text-base">Nenhum imóvel encontrado</p>
          <p className="text-xs sm:text-sm text-muted-foreground px-4">Tenta ajustar os seus filtros ou termos de pesquisa</p>
          {searchQuery && (
            <p className="text-xs sm:text-sm text-accent mt-2 px-4">
              Experimenta pesquisar por características específicas como localização ou tipo de imóvel
            </p>
          )}
        </div>
      )}
    </div>
  );
}