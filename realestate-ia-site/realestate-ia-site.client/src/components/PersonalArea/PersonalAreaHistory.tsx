import { Clock, X, Eye, Calendar } from 'lucide-react';
import type { Property } from '../../types/property';
import type { ViewHistoryItem, User } from '../../types/PersonalArea';
import { PropertyCard } from '../PropertyCard';
import { EmptyState } from '../EmptyState';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="w-full h-24 bg-muted rounded-xl"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="w-full h-96 bg-muted rounded-2xl"></div>
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

  // Calculate statistics
  const totalViews = viewHistory.length;
  const viewsToday = viewHistory.filter(item => {
    const viewed = new Date(item.viewedAt);
    const today = new Date();
    return viewed.toDateString() === today.toDateString();
  }).length;
  const viewsThisWeek = viewHistory.filter(item => {
    const viewed = new Date(item.viewedAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return viewed >= weekAgo;
  }).length;

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Views */}
        <Card className="p-4 bg-gradient-to-br from-ocean-teal/10 to-ocean-teal/5 border-accent/20 hover:shadow-medium transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-accent/20 rounded-xl">
              <Eye className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Visualizações</p>
              <p className="text-2xl font-bold text-accent-dark">{totalViews}</p>
            </div>
          </div>
        </Card>

        {/* Today's Views */}
        <Card className="p-4 bg-gradient-to-br from-deep-navy/10 to-deep-navy/5 border-deep-navy/20 hover:shadow-medium transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 rounded-xl">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Hoje</p>
              <p className="text-2xl font-bold text-foreground">{viewsToday}</p>
            </div>
          </div>
        </Card>

        {/* This Week's Views */}
        <Card className="p-4 bg-gradient-to-br from-muted/10 to-muted/5 border-border/20 hover:shadow-medium transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-muted/20 rounded-xl">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Esta Semana</p>
              <p className="text-2xl font-bold text-foreground">{viewsThisWeek}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Properties Grid - Modern Layout */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Histórico Recente</h3>
          <p className="text-sm text-muted-foreground">
            {viewHistory.length} {viewHistory.length === 1 ? 'imóvel' : 'imóveis'}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {viewHistory.map((item, index) => (
            <div 
              key={item.id} 
              className="relative group animate-slide-in-up pt-8"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Header Simples - Acima do Card */}
              <div className="flex items-center justify-between mb-3">
                {/* Info à Esquerda */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold">#{index + 1}</span>
                  <span>•</span>
                  <Clock className="h-3 w-3" />
                  <span>{formatViewedAt(item.viewedAt)}</span>
                </div>

                {/* Remove Button */}
                {onRemoveFromHistory && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromHistory(item.id);
                    }}
                    className="h-6 w-6 p-0 rounded hover:bg-error/10 hover:text-error transition-colors"
                    title="Remover do histórico"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* Property Card */}
              <PropertyCard
                property={item.property}
                onToggleFavorite={onToggleFavorite}
                onPropertyView={onPropertyView}
                isFavorite={favorites.some(f => f.id === item.property.id)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Footer Information */}
      <div className="text-center pt-4 border-t border-whisper-blue">
        <p className="text-sm text-muted-foreground">
          Mostrando os últimos <span className="font-semibold text-accent">{viewHistory.length}</span> imóveis visualizados
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          O histórico mantém apenas os 10 imóveis mais recentes
        </p>
      </div>
    </div>
  );
}