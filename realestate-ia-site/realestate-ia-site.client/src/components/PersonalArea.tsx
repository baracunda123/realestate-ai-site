import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  BarChart3, 
  Heart, 
  Bookmark, 
  Bell, 
  Clock, 
  Settings,
  ArrowLeft
} from 'lucide-react';
import type { Property } from '../types/property';
import type { User, SavedSearch, PropertyAlert, ViewHistoryItem } from '../types/PersonalArea';
import type { SearchFilters as SearchFiltersType } from '../types/SearchFilters';
import { Button } from './ui/button';
import { PersonalAreaHeader } from './PersonalArea/PersonalAreaHeader';
import { PersonalAreaDashboard } from './PersonalArea/PersonalAreaDashboard';
import { PersonalAreaFavorites } from './PersonalArea/PersonalAreaFavorites';
import { PersonalAreaSearches } from './PersonalArea/PersonalAreaSearches';
import { PersonalAreaAlerts } from './PersonalArea/PersonalAreaAlerts';
import { PersonalAreaHistory } from './PersonalArea/PersonalAreaHistory';
import { PersonalAreaSettings } from './PersonalArea/PersonalAreaSettings';
import { toast } from 'sonner';
import { 
  deleteAlert as deleteAlertService,
  updateAlert as updateAlertService
} from '../api/alerts.service';
import { 
  getSavedSearches as getSavedSearchesService,
  deleteSavedSearch as deleteSavedSearchService
} from '../api/saved-searches.service';
import { 
  getViewHistory as getViewHistoryService,
  trackPropertyView,
  removeFromViewHistory
} from '../api/view-history.service';
import { useNotifications } from '../hooks/useNotifications';

interface PersonalAreaProps {
  user: User;
  onNavigateToHome?: (reset?: boolean) => void;
  onExecuteSearch?: (query: string, filters?: SearchFiltersType) => void;
  favorites: Property[];
  onToggleFavorite: (property: Property) => void;
  hasActiveSearch?: boolean;
  onCreatePriceAlert: (property: Property) => void;
  hasAlertForPropertyId?: (propertyId: string) => boolean;
  alerts?: PropertyAlert[];
  onDeleteAlert?: (alertId: string) => Promise<void>
  onUpdateAlert?: (alertId: string, threshold: number) => Promise<void>
  onUpdateProfile?: (profileData: Partial<User>) => void; // Add this prop
}

export function PersonalArea({ 
  user, 
  onNavigateToHome,
  onExecuteSearch,
  favorites, 
  onToggleFavorite,
  hasActiveSearch = false,
  onCreatePriceAlert,
  hasAlertForPropertyId,
  alerts = [],
  onDeleteAlert,
  onUpdateAlert,
  onUpdateProfile // Add this parameter
}: PersonalAreaProps) {
  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data state
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [viewHistory, setViewHistory] = useState<ViewHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Hook para notificações com refresh automático
  const { unreadCount } = useNotifications();

  // Carregar dados ao montar
  useEffect(() => {
    const loadData = async () => {
      try {
        // Carregar pesquisas salvas
        const searchesResp = await getSavedSearchesService();
        setSavedSearches(searchesResp.searches || []);
      } catch {
        setSavedSearches([]);
      }
    };

    loadData();
  }, []);

  // Carregar histórico quando a aba for ativada OU quando houver mudança
  useEffect(() => {
    if (activeTab === 'history') {
      // Sempre carregar quando entrar na aba de histórico
      loadViewHistory();
    }
  }, [activeTab]);

  const loadViewHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const historyResp = await getViewHistoryService();
      setViewHistory(historyResp.viewHistory || []);
    } catch (error) {
      console.error('Failed to load view history:', error);
      setViewHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

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
      console.error('Failed to track property view:', error);
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
      console.error('Failed to remove from history:', error);
      toast.error('Erro ao remover item do histórico');
    }
  };

  // Handler para deletar alerta - usar função passada por prop ou fallback
  const handleDeleteAlert = async (alertId: string) => {
    if (onDeleteAlert) {
      await onDeleteAlert(alertId);
    } else {
      // Fallback para compatibilidade - sem toast adicional
      try {
        await deleteAlertService(alertId);
      } catch {
        toast.error('Falha ao remover alerta');
      }
    }
  };

  // Handler para atualizar alerta - usar função passada por prop ou fallback
  const handleUpdateAlert = async (alertId: string, threshold: number) => {
    if (onUpdateAlert) {
      await onUpdateAlert(alertId, threshold);
    } else {
      // Fallback para compatibilidade - sem toast adicional
      try {
        await updateAlertService(alertId, { alertThresholdPercentage: threshold });
      } catch {
        toast.error('Falha ao atualizar alerta');
      }
    }
  };

  const handleDeleteSearch = async (searchId: string) => {
    try {
      await deleteSavedSearchService(searchId);
      setSavedSearches(prev => prev.filter(s => s.id !== searchId));
      toast.success('Pesquisa removida!');
    } catch {
      toast.error('Falha ao remover pesquisa salva.');
    }
  };

  const handleExecuteSavedSearch = async (search: SavedSearch) => {
    try {
      // Primeiro navegar para home
      if (onNavigateToHome) {
        onNavigateToHome();
      }
      
      // Depois executar a pesquisa
      if (onExecuteSearch) {
        // Convert SavedSearch filters to SearchFilters format
        const searchFilters: SearchFiltersType = {
          location: search.filters.location || '',
          priceRange: search.filters.priceRange || [0, 2000000],
          bedrooms: search.filters.bedrooms || null,
          bathrooms: search.filters.bathrooms || null,
          propertyType: search.filters.propertyType || 'any',
          hasGarage: search.filters.hasGarage,
          sortBy: 'relevance',
          sortOrder: 'desc'
        };
        
        onExecuteSearch(search.query, searchFilters);
        toast.success('Executando pesquisa salva...', {
          description: `Pesquisando: "${search.query}"`
        });
      }
      
    } catch {
      toast.error('Erro ao executar pesquisa');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
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
        <TabsList className="grid w-full grid-cols-6 h-14">
          <TabsTrigger value="dashboard" className="w-full flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="w-full flex items-center space-x-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Favoritos</span>
          </TabsTrigger>
          <TabsTrigger value="searches" className="w-full flex items-center space-x-2">
            <Bookmark className="h-4 w-4" />
            <span className="hidden sm:inline">Pesquisas</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="w-full flex items-center space-x-2 relative">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alertas</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-burnt-peach text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="w-full flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="w-full flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configurações</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <PersonalAreaDashboard
            favoritesCount={favorites.length}
            savedSearchesCount={savedSearches.length}
            alertsCount={alerts.filter(alert => alert.isActive).length}
            onCardClick={(cardType) => {
              if (cardType === 'favorites') setActiveTab('favorites');
              if (cardType === 'searches') setActiveTab('searches');
              if (cardType === 'alerts') setActiveTab('alerts');
            }}
          />
        </TabsContent>

        <TabsContent value="favorites">
          <PersonalAreaFavorites
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            onCreatePriceAlert={onCreatePriceAlert}
            hasAlertForPropertyId={hasAlertForPropertyId}
            onPropertyView={handlePropertyView}
          />
        </TabsContent>

        <TabsContent value="searches">
          <PersonalAreaSearches
            savedSearches={savedSearches}
            onDeleteSearch={handleDeleteSearch}
            onNavigateToHome={onNavigateToHome}
            onExecuteSearch={handleExecuteSavedSearch}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <PersonalAreaAlerts
            user={user}
            alerts={alerts}
            onDeleteAlert={handleDeleteAlert}
            onUpdateAlert={handleUpdateAlert}
            onNavigateToHome={onNavigateToHome}
          />
        </TabsContent>

        <TabsContent value="history">
          <PersonalAreaHistory
            user={user}
            viewHistory={viewHistory}
            onPropertyView={handlePropertyView}
            onToggleFavorite={onToggleFavorite}
            onCreatePriceAlert={onCreatePriceAlert}
            hasAlertForPropertyId={hasAlertForPropertyId}
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
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}