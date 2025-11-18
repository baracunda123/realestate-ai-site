import { useState, useEffect } from 'react';
import { PersonalAreaHistory } from '../components/PersonalArea/PersonalAreaHistory';
import type { Property } from '../types/property';
import type { User, ViewHistoryItem } from '../types/PersonalArea';
import { toast } from 'sonner';
import { personalArea as logger } from '../utils/logger';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
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
              className="flex items-center gap-2 text-gray-600 hover:text-white -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar aos Resultados</span>
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold text-title">Histórico de visualizações</h1>
            <p className="text-muted-foreground mt-2">
              Propriedades que visualizaste recentemente
            </p>
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
