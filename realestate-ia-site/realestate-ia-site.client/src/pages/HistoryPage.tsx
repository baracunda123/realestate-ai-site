import { useState, useEffect } from 'react';
import { PersonalAreaHistory } from '../components/PersonalArea/PersonalAreaHistory';
import type { Property } from '../types/property';
import type { User, ViewHistoryItem } from '../types/PersonalArea';
import { toast } from 'sonner';
import { personalArea as logger } from '../utils/logger';
import { Button } from '../components/ui/button';
import { ArrowLeft, Clock, Sparkles } from 'lucide-react';
import { 
  getViewHistory as getViewHistoryService,
  trackPropertyView,
  removeFromViewHistory
} from '../api/view-history.service';

interface HistoryPageProps {
  user: User;
  favorites: Property[];
  onToggleFavorite: (property: Property) => void;
  hasActiveSearch?: boolean;
  onNavigateToHome?: (reset?: boolean) => void;
}

export function HistoryPage({ 
  user,
  favorites,
  onToggleFavorite,
  hasActiveSearch,
  onNavigateToHome
}: HistoryPageProps) {
  const [viewHistory, setViewHistory] = useState<ViewHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    loadViewHistory();
  }, []);

  const loadViewHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const historyResp = await getViewHistoryService();
      setViewHistory(historyResp.viewHistory || []);
    } catch (error) {
      logger.error('Failed to load view history', error as Error);
      setViewHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handlePropertyView = async (property: Property) => {
    try {
      await trackPropertyView(property);
      await loadViewHistory();
    } catch (error) {
      logger.error('Failed to track property view', error as Error);
    }
  };

  const handleRemoveFromHistory = async (historyId: string) => {
    try {
      await removeFromViewHistory(historyId);
      setViewHistory(prev => prev.filter(item => item.id !== historyId));
      toast.success('Item removido do histórico');
    } catch (error) {
      logger.error('Failed to remove from history', error as Error);
      toast.error('Erro ao remover item do histórico');
    }
  };

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
              <div className="absolute top-0 left-0 w-64 h-64 bg-accent/30 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl"></div>
            </div>
            
            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-accent/20 backdrop-blur-sm rounded-xl">
                  <Clock className="h-8 w-8 text-accent" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-foreground flex items-center gap-2">
                    Histórico
                    <Sparkles className="h-6 w-6 text-accent/80" />
                  </h1>
                </div>
              </div>
              <p className="text-foreground/90 text-lg max-w-2xl">
                Propriedades que visualizaste recentemente. Revê as tuas pesquisas e não percas nenhuma oportunidade.
              </p>
              
              {/* Stats Badge */}
              <div className="mt-4 inline-flex items-center gap-2 bg-accent/20 backdrop-blur-sm px-4 py-2 rounded-full">
                <Clock className="h-4 w-4 text-accent" />
                <span className="text-foreground font-semibold">
                  {viewHistory.length} {viewHistory.length === 1 ? 'visualização' : 'visualizações'}
                </span>
              </div>
            </div>
          </div>

          {/* History Content */}
          <PersonalAreaHistory
            user={user}
            viewHistory={viewHistory}
            onPropertyView={handlePropertyView}
            onToggleFavorite={onToggleFavorite}
            favorites={favorites}
            isLoading={isLoadingHistory}
            onRefresh={loadViewHistory}
            onRemoveFromHistory={handleRemoveFromHistory}
          />
        </div>
      </div>
    </div>
  );
}