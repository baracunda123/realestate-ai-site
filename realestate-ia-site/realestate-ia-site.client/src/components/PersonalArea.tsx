import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  BarChart3, 
  Heart, 
  Bookmark, 
  Bell, 
  Clock, 
  Settings 
} from 'lucide-react';
import type { Property } from '../types/property';
import type { User, SavedSearch, PropertyAlert, ViewHistoryItem, NotificationSettings, CreateAlertRequest } from '../types/PersonalArea';
import type { SearchFilters as SearchFiltersType } from '../types/SearchFilters';
import type { NewAlert } from './NewAlertModalFixed';
import { NewAlertModal } from './NewAlertModalFixed';
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
  createAlert as createAlertService, 
  deleteAlert as deleteAlertService,
  toggleAlert as toggleAlertService
} from '../api/alerts.service';
import { 
  getSavedSearches as getSavedSearchesService,
  deleteSavedSearch as deleteSavedSearchService,
  executeSavedSearch
} from '../api/saved-searches.service';

interface PersonalAreaProps {
  user: User;
  onPropertySelect: (property: Property) => void;
  onNavigateToAlertResults?: (alert: PropertyAlert) => void;
  onNavigateToHome?: () => void;
  onExecuteSearch?: (query: string, filters?: SearchFiltersType) => void;
  favorites: Property[];
  onToggleFavorite: (property: Property) => void;
}

export function PersonalArea({ 
  user, 
  onPropertySelect, 
  onNavigateToAlertResults, 
  onNavigateToHome,
  onExecuteSearch,
  favorites, 
  onToggleFavorite 
}: PersonalAreaProps) {
  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isNewAlertModalOpen, setIsNewAlertModalOpen] = useState(false);
  
  // Data state
  const [alerts, setAlerts] = useState<PropertyAlert[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    sms: false,
    priceAlerts: true,
    newListings: true,
    marketInsights: true,
    weeklyDigest: true,
    alertFrequency: 'immediate'
  });

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

  // Handlers
  const handleCreateAlert = async (alert: NewAlert) => {
    const payload: CreateAlertRequest = {
      name: alert.name,
      location: alert.location,
      propertyType: alert.propertyType,
      minPrice: alert.priceRange?.[0],
      maxPrice: alert.priceRange?.[1],
      bedrooms: alert.bedrooms,
      bathrooms: alert.bathrooms,
      emailNotifications: alert.emailNotifications,
      smsNotifications: alert.smsNotifications,
      priceDropAlerts: alert.priceDropAlerts,
      newListingAlerts: alert.newListingAlerts,
    };

    try {
      const created = await createAlertService(payload);
      setAlerts(prev => [...prev, created]);
      setIsNewAlertModalOpen(false);
      toast.success('Alerta criado com sucesso!', {
        description: `Você será notificado sobre propriedades que correspondem aos critérios definidos.`
      });
    } catch {
      toast.error('Falha ao criar alerta no servidor.');
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await deleteAlertService(alertId);
      setAlerts(prev => prev.filter(a => a.id !== alertId));
      toast.success('Alerta removido!');
    } catch {
      toast.error('Falha ao remover alerta no servidor.');
    }
  };

  const handleToggleAlert = async (alertId: string) => {
    const current = alerts.find(a => a.id === alertId);
    if (!current) return;

    try {
      const updated = await toggleAlertService(alertId, !current.isActive);
      setAlerts(prev => prev.map(a => (a.id === alertId ? updated : a)));
      toast.success(updated.isActive ? 'Alerta ativado!' : 'Alerta pausado!');
    } catch {
      toast.error('Falha ao alterar estado do alerta.');
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
        onExecuteSearch(search.query, search.filters);
        toast.success('Executando pesquisa salva...', {
          description: `Pesquisando: "${search.query}"`
        });
      }
      
      // Opcional: executar no backend para atualizar estatísticas
      try {
        await executeSavedSearch(search.id, false);
      } catch {
        // Ignorar erro silenciosamente - a pesquisa ainda funciona no frontend
      }
    } catch {
      toast.error('Erro ao executar pesquisa', {
        description: 'Tente novamente em alguns instantes.'
      });
    }
  };

  // Sem histórico por enquanto (removemos mocks)
  const viewHistory: ViewHistoryItem[] = [];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
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
          <TabsTrigger value="alerts" className="w-full flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Alertas</span>
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
            user={user}
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
            user={user}
            favorites={favorites}
            onPropertySelect={onPropertySelect}
            onToggleFavorite={onToggleFavorite}
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
            onCreateAlert={() => setIsNewAlertModalOpen(true)}
            onDeleteAlert={handleDeleteAlert}
            onToggleAlert={handleToggleAlert}
            onNavigateToAlertResults={onNavigateToAlertResults}
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
            notifications={notifications}
            onUpdateNotifications={(settings) => {
              setNotifications(settings);
              toast.success('Configurações atualizadas!');
            }}
          />
        </TabsContent>
      </Tabs>

      <NewAlertModal
        isOpen={isNewAlertModalOpen}
        onClose={() => setIsNewAlertModalOpen(false)}
        onCreateAlert={handleCreateAlert}
      />
    </div>
  );
}