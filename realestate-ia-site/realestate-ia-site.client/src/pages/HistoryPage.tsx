import { useState, useEffect } from 'react';
import { ProfileLayout } from '../components/Profile/ProfileLayout';
import { PersonalAreaHistory } from '../components/PersonalArea/PersonalAreaHistory';
import type { Property } from '../types/property';
import type { User, ViewHistoryItem } from '../types/PersonalArea';
import { toast } from 'sonner';
import { personalArea as logger } from '../utils/logger';
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
    <ProfileLayout hasActiveSearch={hasActiveSearch} onNavigateToHome={onNavigateToHome}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-title">Histórico de visualizações</h1>
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
    </ProfileLayout>
  );
}
