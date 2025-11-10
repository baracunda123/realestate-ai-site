import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  BarChart3, 
  Heart, 
  Clock, 
  Settings,
  ArrowLeft
} from 'lucide-react';
import type { Property } from '../types/property';
import type { User, ViewHistoryItem } from '../types/PersonalArea';
import { Button } from './ui/button';
import { PersonalAreaHeader } from './PersonalArea/PersonalAreaHeader';
import { PersonalAreaDashboard } from './PersonalArea/PersonalAreaDashboard';
import { PersonalAreaFavorites } from './PersonalArea/PersonalAreaFavorites';
import { PersonalAreaHistory } from './PersonalArea/PersonalAreaHistory';
import { PersonalAreaSettings } from './PersonalArea/PersonalAreaSettings';
import { toast } from 'sonner';
import { personalArea as logger } from '../utils/logger';
import { 
  getViewHistory as getViewHistoryService,
  trackPropertyView,
  removeFromViewHistory
} from '../api/view-history.service';

interface PersonalAreaProps {
  user: User;
  onNavigateToHome?: (reset?: boolean) => void;
  onExecuteSearch?: (query: string) => void;
  favorites: Property[];
  onToggleFavorite: (property: Property) => void;
  hasActiveSearch?: boolean;
  onUpdateProfile?: (profileData: Partial<User>) => void;
  onDeleteAccount?: () => void;
}

export function PersonalArea({ 
  user, 
  onNavigateToHome,
  favorites, 
  onToggleFavorite,
  hasActiveSearch = false,
  onUpdateProfile,
  onDeleteAccount
}: PersonalAreaProps) {
  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data state
  const [viewHistory, setViewHistory] = useState<ViewHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Carregar histórico quando a aba for ativada OU quando houver mudança
  useEffect(() => {
    if (activeTab === 'history') {
      loadViewHistory();
    }
  }, [activeTab]);

  // Handler para refrescar histórico após nova visualização
  const handlePropertyView = async (property: Property) => {
    try {
      // Track the view
      await trackPropertyView(property);
      
      // Refresh history IMEDIATAMENTE se estamos na aba de histórico
      if (activeTab === 'history') {
        await loadViewHistory();
      }
    } catch (error) {
      logger.error('Failed to track property view', error as Error);
    }
  };

  // Handler para remover item do histórico
  const handleRemoveFromHistory = async (historyId: string) => {
    try {
      await removeFromViewHistory(historyId);
      
      // Atualizar lista local imediatamente
      setViewHistory(prev => prev.filter(item => item.id !== historyId));
      
      toast.success('Item removido do histórico');
    } catch (error) {
      logger.error('Failed to remove from history', error as Error);
      toast.error('Erro ao remover item do histórico');
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Botão Voltar aos Resultados - apenas se houver pesquisa ativa */}
      {hasActiveSearch && (
        <div className="back-button-container flex justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateToHome?.(false)}
            className="back-to-results-btn flex items-center space-x-2 text-sm px-4 py-2 font-medium shadow-clay-soft focus:outline-none focus:ring-2 focus:ring-burnt-peach/20"
          >
            <ArrowLeft className="back-icon h-4 w-4" />
            <span>Voltar aos Resultados</span>
          </Button>
        </div>
      )}
      
      <PersonalAreaHeader user={user} />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-14 gap-1 p-1">
          <TabsTrigger value="dashboard" className="w-full flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-0 text-xs sm:text-sm">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="w-full flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-0 text-xs sm:text-sm">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Favoritos</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="w-full flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-0 text-xs sm:text-sm">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="w-full flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 py-2 sm:py-0 text-xs sm:text-sm">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <PersonalAreaDashboard
            favoritesCount={favorites.length}
            onCardClick={(cardType) => {
              if (cardType === 'favorites') setActiveTab('favorites');
            }}
          />
        </TabsContent>

        <TabsContent value="favorites">
          <PersonalAreaFavorites
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            onPropertyView={handlePropertyView}
          />
        </TabsContent>

        <TabsContent value="history">
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
        </TabsContent>

        <TabsContent value="settings">
          <PersonalAreaSettings
            user={user}
            onUpdateProfile={onUpdateProfile}
            onDeleteAccount={onDeleteAccount}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}