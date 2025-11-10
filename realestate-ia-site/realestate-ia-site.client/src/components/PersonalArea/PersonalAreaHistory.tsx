import { Clock, X } from 'lucide-react';
import type { Property } from '../../types/property';
import type { ViewHistoryItem, User } from '../../types/PersonalArea';
import { PropertyCard } from '../PropertyCard';
import { EmptyState } from '../EmptyState';
import { Button } from '../ui/button';
import { useEffect } from 'react';

interface PersonalAreaHistoryProps {
  user: User;
  viewHistory: ViewHistoryItem[];
  onPropertyView?: (property: Property) => void;
  onToggleFavorite?: (property: Property) => void;
  favorites?: Property[];
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  onRemoveFromHistory?: (historyId: string) => Promise<void>;
}

export function PersonalAreaHistory({ 
  viewHistory,
  onPropertyView,
  onToggleFavorite,
  favorites = [],
  isLoading = false,
  onRefresh,
  onRemoveFromHistory
}: PersonalAreaHistoryProps) {

  // Only refresh when component first mounts, not on every render
  useEffect(() => {
    if (onRefresh && viewHistory.length === 0 && !isLoading) {
      onRefresh();
    }
  }, []); // Empty dependency array - only runs once on mount

  // Function to format viewed date
  const formatViewedAt = (viewedAt: string): string => {
    const viewed = new Date(viewedAt);
    const now = new Date();
    const diffTime = now.getTime() - viewed.getTime();
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Agora mesmo';
    if (diffMinutes < 60) return `${diffMinutes}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return viewed.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: diffDays > 365 ? 'numeric' : undefined
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium text-foreground">Histórico de Visualizações</h2>
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="w-full h-32 bg-pale-clay-light rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (viewHistory.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Nenhum histórico de visualizações"
        description="Ainda não visualizaste nenhum imóvel. Começa a explorar para veres o histórico aqui!"
        actionLabel="Explorar Imóveis"
        onAction={() => {
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
          <h2 className="font-medium text-foreground">Histórico de Visualizações</h2>
          <p className="text-sm text-muted-foreground">
            {viewHistory.length} imóveis visualizados recentemente
          </p>
        </div>
      </div>

      {/* Properties List - Layout Vertical */}
      <div className="space-y-6">
        {viewHistory.map((item, index) => (
          <div 
            key={item.id} 
            className="relative dashboard-section-card bg-pure-white border border-clay-medium p-6 shadow-clay-soft hover:shadow-clay-medium transition-all duration-300 group overflow-visible"
          >
            {/* Header Row with badges - no absolute positioning */}
            <div className="flex items-center justify-between mb-4">
              {/* History Index Badge - Left */}
              <div className="bg-cocoa-taupe text-pure-white text-xs px-3 py-1.5 rounded-full font-medium">
                #{index + 1}
              </div>

              {/* Right side badges */}
              <div className="flex items-center space-x-3">
                {/* Viewed At Badge */}
                <div className="bg-burnt-peach/10 text-burnt-peach text-xs px-3 py-1.5 rounded-full font-medium border border-burnt-peach/20">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {formatViewedAt(item.viewedAt)}
                </div>

                {/* Remove Button */}
                {onRemoveFromHistory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveFromHistory(item.id)}
                    className="h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-error-soft hover:text-error-strong"
                    title="Remover do histórico"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Property Card - no padding adjustments needed */}
            <PropertyCard
              property={item.property}
              onToggleFavorite={onToggleFavorite}
              onPropertyView={onPropertyView}
              isFavorite={favorites.some(f => f.id === item.property.id)}
            />
          </div>
        ))}
      </div>

      {/* Footer Information */}
      <div className="text-center pt-4 border-t border-whisper-clay">
        <p className="text-xs text-muted-foreground">
          Mostrando os últimos {viewHistory.length} imóveis visualizados
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          O histórico mantém apenas os 10 imóveis mais recentes
        </p>
      </div>
    </div>
  );
}