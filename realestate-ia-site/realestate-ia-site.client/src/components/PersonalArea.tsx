import React, { useState } from 'react';
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
const mockFavoriteProperties: Property[] = [
  {
    id: '1',
    title: 'Loft Moderno no Centro',
    price: 850000,
    bedrooms: 2,
    bathrooms: 2,
    area: 1200,
    location: 'Centro de São Paulo',
    address: '123 Rua Augusta, São Paulo, SP 01234-567',
    images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'],
    description: 'Loft moderno com janelas do chão ao teto e vista da cidade.',
    features: ['Vista da Cidade', 'Cozinha Moderna', 'Piso de Madeira'],
    yearBuilt: 2018,
    propertyType: 'apartment',
    listingAgent: {
      name: 'Sarah Silva',
      phone: '(11) 99999-0123',
      email: 'sarah@imobiliaria.com'
    }
  },
  {
    id: '3',
    title: 'Cobertura de Luxo com Vista',
    price: 1800000,
    bedrooms: 3,
    bathrooms: 2,
    area: 1800,
    location: 'Jardins',
    address: '789 Rua Oscar Freire, São Paulo, SP 01426-001',
    images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop'],
    description: 'Cobertura de luxo com vista panorâmica.',
    features: ['Vista Panorâmica', 'Concierge', 'Academia'],
    yearBuilt: 2020,
    propertyType: 'condo',
    listingAgent: {
      name: 'Emily Rodriguez',
      phone: '(11) 99999-0789',
      email: 'emily@imobiliaria.com'
    }
  },
  {
    id: '4',
    title: 'Casa de Campo Aconchegante',
    price: 1250000,
    bedrooms: 4,
    bathrooms: 3,
    area: 2200,
    location: 'Morumbi',
    address: '456 Rua das Palmeiras, São Paulo, SP 05678-901',
    images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop'],
    description: 'Casa espaçosa com jardim e área gourmet.',
    features: ['Jardim Amplo', 'Área Gourmet', 'Lareira', 'Garagem 3 Vagas'],
    yearBuilt: 2015,
    propertyType: 'house',
    listingAgent: {
      name: 'Carlos Mendes',
      phone: '(11) 99999-0456',
      email: 'carlos@imobiliaria.com'
    }
  }
];

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
}

export function PersonalArea({ user, onPropertySelect, onOpenUpgradeModal, onNavigateToAlertResults }: PersonalAreaProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [favoriteProperties, setFavoriteProperties] = useState<Property[]>(mockFavoriteProperties);

  // Modal state
  const [isNewAlertModalOpen, setIsNewAlertModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<string | null>(null);
  const [editingAlertData, setEditingAlertData] = useState<any>(null);
  
  // Data state
  const [userAlerts, setUserAlerts] = useState<NewAlert[]>([]);
  const [savedSearches, setSavedSearches] = useState(mockSavedSearches);
  
  // Get current limits for user
  const currentLimits = getCurrentLimits(user);
  
  // Filter saved searches based on user plan limits
  const filteredSavedSearches = user.isPremium 
    ? savedSearches 
    : savedSearches.slice(0, currentLimits.maxSavedSearches);
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
      setSavedSearches(prevSearches => 
        prevSearches.filter(search => search.id !== searchId)
      );
      
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
            favoritesCount={favoriteProperties.length}
            savedSearchesCount={filteredSavedSearches.length}
            alertsCount={allAlerts.filter(alert => alert.isActive).length}
            onCardClick={handleCardClick}
            onOpenUpgradeModal={onOpenUpgradeModal}
          />
        </TabsContent>

        <TabsContent value="favorites">
          <PersonalAreaFavorites
            user={user}
            favorites={favoriteProperties}
            onPropertySelect={onPropertySelect}
            onOpenUpgradeModal={onOpenUpgradeModal}
            onGoToHome={handleGoToHome}
            onToggleFavorite={(property) => {
              setFavoriteProperties((prev) => {
                const exists = prev.some((p) => p.id === property.id);
                return exists ? prev.filter((p) => p.id !== property.id) : [...prev, property];
              });
            }}
          />
        </TabsContent>

        <TabsContent value="searches">
          <PersonalAreaSearches
            user={user}
            savedSearches={filteredSavedSearches}
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
