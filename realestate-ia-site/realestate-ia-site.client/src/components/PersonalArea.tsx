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
  getUserAlerts, 
  deleteAlert as deleteAlertService,
  updateAlert as updateAlertService
} from '../api/alerts.service';
import { 
  getSavedSearches as getSavedSearchesService,
  deleteSavedSearch as deleteSavedSearchService,
  executeSavedSearch
} from '../api/saved-searches.service';
import { useNotifications } from '../hooks/useNotifications';

interface PersonalAreaProps {
  user: User;
  onNavigateToHome?: (reset?: boolean) => void;
  onExecuteSearch?: (query: string, filters?: SearchFiltersType) => void;
  favorites: Property[];
  onToggleFavorite: (property: Property) => void;
  hasActiveSearch?: boolean;
  onCreatePriceAlert: (property: Property) => void;
  onCheckPriceAlert?: (propertyId: string) => Promise<boolean>;
}

export function PersonalArea({ 
  user, 
  onNavigateToHome,
  onExecuteSearch,
  favorites, 
  onToggleFavorite,
  hasActiveSearch = false,
  onCreatePriceAlert,
  onCheckPriceAlert
}: PersonalAreaProps) {
  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data state
  const [alerts, setAlerts] = useState<PropertyAlert[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Hook para notificações com refresh automático
  const { unreadCount } = useNotifications();

  // Carregar alertas e pesquisas salvas ao montar
  useEffect(() => {
    const loadData = async () => {
      try {
        const alertsResp = await getUserAlerts();
        setAlerts(alertsResp.alerts || []);
      } catch {
        setAlerts([]);
      }

      try {
        const searchesResp = await getSavedSearchesService();
        setSavedSearches(searchesResp.searches || []);
      } catch {
        setSavedSearches([]);
      }
    };

    loadData();
  }, []);

  // Refresh automático dos alertas quando há novas notificações
  useEffect(() => {
    const refreshAlerts = async () => {
      if (unreadCount > 0) {
        try {
          const alertsResp = await getUserAlerts();
          setAlerts(alertsResp.alerts || []);
        } catch {
          // Ignorar erro silenciosamente
        }
      }
    };

    refreshAlerts();
  }, [unreadCount]);

  // Handler para verificar se propriedade tem alerta - apenas wrapper para a prop
  const handleCheckPriceAlert = async (propertyId: string): Promise<boolean> => {
    try {
      if (onCheckPriceAlert) {
        return await onCheckPriceAlert(propertyId);
      }
      // Fallback: check local alerts state
      return alerts.some(alert => alert.propertyId === propertyId && alert.isActive);
    } catch {
      return false;
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await deleteAlertService(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success('Alerta removido!');
    } catch {
      toast.error('Falha ao remover alerta');
    }
  };

  const handleUpdateAlert = async (alertId: string, threshold: number) => {
    try {
      const updated = await updateAlertService(alertId, { alertThresholdPercentage: threshold });
      setAlerts(prev => prev.map(a => (a.id === alertId ? updated : a)));
      toast.success(`Alerta atualizado para ${threshold}%`);
    } catch {
      toast.error('Falha ao atualizar alerta');
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
      
      // Opcional: executar no backend para atualizar estatísticas
      try {
        await executeSavedSearch(search.id, false);
      } catch {
        // Ignorar erro silenciosamente
      }
    } catch {
      toast.error('Erro ao executar pesquisa');
    }
  };

  // Sem histórico por enquanto
  const viewHistory: ViewHistoryItem[] = [];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Botão Voltar aos Resultados - apenas se houver pesquisa ativa */}
      {hasActiveSearch && (
        <div className="flex justify-start">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateToHome?.(false)}
            className="flex items-center space-x-2 text-sm hover:bg-burnt-peach hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
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
            onCheckPriceAlert={handleCheckPriceAlert}
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
          />
        </TabsContent>

        <TabsContent value="history">
          <PersonalAreaHistory
            user={user}
            viewHistory={viewHistory}
            onGoToHome={() => setActiveTab('dashboard')}
          />
        </TabsContent>

        <TabsContent value="settings">
          <PersonalAreaSettings
            user={user}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}