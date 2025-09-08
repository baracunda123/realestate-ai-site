import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  BarChart3, 
  Heart, 
  Bookmark, 
  Bell, 
  Clock, 
  Crown, 
  Settings 
} from 'lucide-react';
import type { Property } from '../types/property';
import type { User, SavedSearch, PropertyAlert, ViewHistoryItem, NotificationSettings } from '../types/PersonalArea';
import { getCurrentLimits } from '../utils/PersonalArea';
import type { NewAlert } from './NewAlertModalFixed';
import { NewAlertModal } from './NewAlertModalFixed';
import { PersonalAreaHeader } from './PersonalArea/PersonalAreaHeader';
import { PersonalAreaDashboard } from './PersonalArea/PersonalAreaDashboard';
import { PersonalAreaFavorites } from './PersonalArea/PersonalAreaFavorites';
import { PersonalAreaSearches } from './PersonalArea/PersonalAreaSearches';
import { PersonalAreaAlerts } from './PersonalArea/PersonalAreaAlerts';
import { PersonalAreaHistory } from './PersonalArea/PersonalAreaHistory';
import { PersonalAreaPlans } from './PersonalArea/PersonalAreaPlans';
import { PersonalAreaSettings } from './PersonalArea/PersonalAreaSettings';
import { toast } from 'sonner';

// Mock data - in a real app, this would come from API/database

const mockSavedSearches: SavedSearch[] = [
  {
    id: '1',
    name: 'Apartamentos Vila Madalena',
    query: 'apartamento moderno Vila Madalena 2 quartos',
    filters: { location: 'Vila Madalena', bedrooms: 2, propertyType: 'apartment' },
    createdAt: new Date('2024-12-15'),
    results: 23,
    newResults: 3
  },
  {
    id: '2',
    name: 'Casas Jardins Luxo',
    query: 'casa luxuosa Jardins 3 quartos piscina',
    filters: { location: 'Jardins', bedrooms: 3, propertyType: 'house' },
    createdAt: new Date('2024-12-18'),
    results: 15,
    newResults: 1
  }
];

const mockPropertyAlerts: PropertyAlert[] = [
  {
    id: '1',
    name: 'Apartamentos Centro até R$ 4M',
    location: 'Centro de São Paulo',
    propertyType: 'apartment',
    priceRange: [0, 4000000],
    bedrooms: 2,
    bathrooms: null,
    notifications: {
      email: true,
      sms: false,
      priceDrops: true,
      newListings: true
    },
    createdAt: new Date('2024-12-15'),
    isActive: true,
    matchCount: 5,
    newMatches: 2,
    lastTriggered: new Date('2024-12-20')
  }
];

const mockViewHistory: ViewHistoryItem[] = [
  {
    id: '1',
    propertyTitle: 'Apartamento Moderno',
    location: 'Pinheiros',
    price: 950000,
    viewedAt: new Date('2024-12-21'),
    viewCount: 3
  },
  {
    id: '2',
    propertyTitle: 'Casa Familiar Espaçosa',
    location: 'Brooklin',
    price: 1350000,
    viewedAt: new Date('2024-12-20'),
    viewCount: 1
  }
];

interface PersonalAreaProps {
  user: User;
  onPropertySelect: (property: Property) => void;
  onOpenUpgradeModal?: () => void;
  onNavigateToAlertResults?: (alert: PropertyAlert) => void;
  favorites: Property[];
  onToggleFavorite: (property: Property) => void;
}

export function PersonalArea({ user, onPropertySelect, onOpenUpgradeModal, onNavigateToAlertResults, favorites, onToggleFavorite }: PersonalAreaProps) {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modal state
  const [isNewAlertModalOpen, setIsNewAlertModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<string | null>(null);
  const [editingAlertData, setEditingAlertData] = useState<any>(null);
  
  // Data state
  const [userAlerts, setUserAlerts] = useState<NewAlert[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Get current limits for user
  const currentLimits = getCurrentLimits(user);

  // Initialize saved searches from localStorage (fallback to mocks), and clamp to plan limits for Free users
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hf_saved_searches');
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const withDates: SavedSearch[] = parsed.map(s => ({
          ...s,
          createdAt: new Date(s.createdAt)
        }));
        const initial = user.isPremium ? withDates : withDates.slice(0, currentLimits.maxSavedSearches);
        setSavedSearches(initial);
      } else {
        const initial = user.isPremium ? mockSavedSearches : mockSavedSearches.slice(0, currentLimits.maxSavedSearches);
        setSavedSearches(initial);
      }
    } catch {
      const fallback = user.isPremium ? mockSavedSearches : mockSavedSearches.slice(0, currentLimits.maxSavedSearches);
      setSavedSearches(fallback);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist saved searches
  useEffect(() => {
    localStorage.setItem('hf_saved_searches', JSON.stringify(savedSearches));
  }, [savedSearches]);

  // Clamp saved searches when on Free plan (e.g., after downgrade)
  useEffect(() => {
    if (!user.isPremium && savedSearches.length > currentLimits.maxSavedSearches) {
      setSavedSearches(prev => prev.slice(0, currentLimits.maxSavedSearches));
    }
  }, [user.isPremium, currentLimits.maxSavedSearches, savedSearches.length]);

  const [mockAlertsStatus, setMockAlertsStatus] = useState<Record<string, boolean>>({
    '1': true // Default status for mock alert
  });
  const [currentPlan, setCurrentPlan] = useState(user.isPremium ? 'premium' : 'free');
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    sms: false,
    priceAlerts: true,
    newListings: true,
    marketInsights: user.isPremium || false
  });

  // Combined alerts (mock + user created) with current status
  const allAlerts = [
    ...mockPropertyAlerts.map(alert => ({
      ...alert,
      isActive: mockAlertsStatus[alert.id] ?? alert.isActive
    })), 
    ...userAlerts
  ];

  // Navigation functions
  const handleCardClick = (tabName: string) => {
    setActiveTab(tabName);
  };

  const handleGoToHome = () => {
    window.location.hash = '';
  };

  // Alert management
  const handleCreateNewAlert = () => {
    setEditingAlert(null);
    setEditingAlertData(null);
    setIsNewAlertModalOpen(true);
  };

  const handleToggleAlert = (alertId: string) => {
    const isUserAlert = userAlerts.find(alert => alert.id === alertId);
    
    if (isUserAlert) {
      // Toggle user-created alert
      setUserAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, isActive: !alert.isActive }
            : alert
        )
      );
      
      const alertData = userAlerts.find(alert => alert.id === alertId);
      if (alertData) {
        const newStatus = !alertData.isActive;
        toast.success(`Alerta ${newStatus ? 'ativado' : 'desativado'}!`, {
          description: `"${alertData.name}" foi ${newStatus ? 'ativado' : 'desativado'} com sucesso.`,
        });
      }
    } else {
      // Handle mock alerts status
      const mockAlert = mockPropertyAlerts.find(alert => alert.id === alertId);
      if (mockAlert) {
        setMockAlertsStatus(prevStatus => {
          const currentStatus = prevStatus[alertId] ?? mockAlert.isActive;
          const newStatus = !currentStatus;
          
          toast.success(`Alerta ${newStatus ? 'ativado' : 'desativado'}!`, {
            description: `"${mockAlert.name}" foi ${newStatus ? 'ativado' : 'desativado'} com sucesso.`,
          });
          
          return {
            ...prevStatus,
            [alertId]: newStatus
          };
        });
      }
    }
  };

  const handleCreateAlert = (alertData: NewAlert) => {
    if (editingAlert) {
      // Update existing alert
      setUserAlerts(prevAlerts => 
        prevAlerts.map(alert => 
          alert.id === editingAlert ? { ...alertData, id: editingAlert } : alert
        )
      );
      toast.success('Alerta atualizado com sucesso!', {
        description: `"${alertData.name}" foi atualizado com seus novos critérios.`,
      });
    } else {
      // Create new alert
      setUserAlerts(prevAlerts => [...prevAlerts, alertData]);
      toast.success('Alerta criado com sucesso!', {
        description: `"${alertData.name}" foi criado e está ativo.`,
      });
    }
    // Clear editing state
    setEditingAlert(null);
    setEditingAlertData(null);
  };

  const handleEditAlert = (alertId: string) => {
    const alertToEdit = allAlerts.find(alert => alert.id === alertId);
    if (alertToEdit) {
      setEditingAlert(alertId);
      setEditingAlertData(alertToEdit);
      setIsNewAlertModalOpen(true);
    }
  };

  const handleDeleteAlert = (alertId: string) => {
    const alertToDelete = allAlerts.find(alert => alert.id === alertId);
    
    setTimeout(() => {
      setUserAlerts(prevAlerts => 
        prevAlerts.filter(alert => alert.id !== alertId)
      );
      
      if (alertToDelete) {
        toast.success('Alerta excluído com sucesso!', {
          description: `"${alertToDelete.name}" foi removido dos seus alertas.`,
        });
      }
    }, 150);
  };

  // Search management
  const handleDeleteSavedSearch = (searchId: string) => {
    const searchToDelete = savedSearches.find(search => search.id === searchId);

    setTimeout(() => {
      setSavedSearches(prevSearches => prevSearches.filter(search => search.id !== searchId));
      if (searchToDelete) {
        toast.success('Pesquisa excluída com sucesso!', {
          description: `"${searchToDelete.name}" foi removida das suas pesquisas salvas.`,
        });
      }
    }, 150);
  };

  // Plan management
  const handleReactivateFreePlan = () => {
    setCurrentPlan('free');
    toast.success('Plano Free reativado!', {
      description: 'Você voltou para o plano gratuito. Algumas funcionalidades podem ser limitadas.',
    });
  };

  const handleCancelCurrentPlan = () => {
    if (user.isPremium) {
      toast.success('Plano Premium cancelado!', {
        description: 'Seu plano será downgraded para Free no final do período atual.',
      });
    }
  };

  // Modal handlers
  const handleModalClose = () => {
    setIsNewAlertModalOpen(false);
    setEditingAlert(null);
    setEditingAlertData(null);
  };

  // Settings handlers
  const handleUpdateNotifications = (newSettings: NotificationSettings) => {
    setNotifications(newSettings);
  };

  const handleDeleteAccount = () => {
    toast.error('Conta excluída!', {
      description: 'Sua conta foi excluída permanentemente.',
    });
  };

  return (
    <div className="site-container space-y-6 py-6">
      {/* Header */}
      <PersonalAreaHeader 
        user={user} 
        onOpenUpgradeModal={onOpenUpgradeModal} 
      />

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7 gap-2 bg-pale-clay-light border border-pale-clay-deep">
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
          <TabsTrigger value="plans" className="w-full flex items-center space-x-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">Planos</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="w-full flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <TabsContent value="dashboard" className="space-y-6">
          <PersonalAreaDashboard
            user={user}
            favoritesCount={favorites.length}
            savedSearchesCount={savedSearches.length}
            alertsCount={allAlerts.filter(alert => alert.isActive).length}
            onCardClick={handleCardClick}
            onOpenUpgradeModal={onOpenUpgradeModal}
          />
        </TabsContent>

        <TabsContent value="favorites">
          <PersonalAreaFavorites
            user={user}
            favorites={favorites}
            onPropertySelect={onPropertySelect}
            onOpenUpgradeModal={onOpenUpgradeModal}
            onGoToHome={handleGoToHome}
            onToggleFavorite={onToggleFavorite}
          />
        </TabsContent>

        <TabsContent value="searches">
          <PersonalAreaSearches
            user={user}
            savedSearches={savedSearches}
            onDeleteSearch={handleDeleteSavedSearch}
            onOpenUpgradeModal={onOpenUpgradeModal}
            onGoToHome={handleGoToHome}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <PersonalAreaAlerts
            user={user}
            alerts={allAlerts}
            onCreateAlert={handleCreateNewAlert}
            onEditAlert={handleEditAlert}
            onDeleteAlert={handleDeleteAlert}
            onToggleAlert={handleToggleAlert}
            onOpenUpgradeModal={onOpenUpgradeModal}
            onNavigateToAlertResults={onNavigateToAlertResults}
          />
        </TabsContent>

        <TabsContent value="history">
          <PersonalAreaHistory
            user={user}
            viewHistory={mockViewHistory}
            onGoToHome={handleGoToHome}
          />
        </TabsContent>

        <TabsContent value="plans">
          <PersonalAreaPlans
            user={user}
            currentPlan={currentPlan}
            onReactivateFreePlan={handleReactivateFreePlan}
            onCancelCurrentPlan={handleCancelCurrentPlan}
            onOpenUpgradeModal={onOpenUpgradeModal}
          />
        </TabsContent>

        <TabsContent value="settings">
          <PersonalAreaSettings
            user={user}
            notifications={notifications}
            onUpdateNotifications={handleUpdateNotifications}
            onDeleteAccount={handleDeleteAccount}
          />
        </TabsContent>
      </Tabs>

      {/* Alert Modal */}
      <NewAlertModal
        isOpen={isNewAlertModalOpen}
        onClose={handleModalClose}
        onCreateAlert={handleCreateAlert}
        editingAlert={editingAlertData}
      />
    </div>
  );
}
