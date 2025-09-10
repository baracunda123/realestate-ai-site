import React, { useState, useEffect } from 'react';
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
import type { User, SavedSearch, PropertyAlert, ViewHistoryItem, NotificationSettings } from '../types/PersonalArea';
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

// Mock data - in a real app, this would come from API/database

const mockSavedSearches: SavedSearch[] = [
  {
    id: '1',
    userId: 'user-1',
    name: 'Casas T3 em Lisboa',
    query: 'casas com 3 quartos em Lisboa',
    filters: {
      location: 'Lisboa',
      propertyType: 'house',
      bedrooms: 3,
      priceRange: [300000, 800000]
    },
    createdAt: new Date('2024-01-15'),
    results: 24,
    newResults: 3
  },
  {
    id: '2',
    userId: 'user-1',
    name: 'Apartamentos T2 no Porto',
    query: 'apartamentos T2 no Porto até 400k',
    filters: {
      location: 'Porto',
      propertyType: 'apartment',
      bedrooms: 2,
      priceRange: [250000, 400000]
    },
    createdAt: new Date('2024-01-10'),
    results: 18,
    newResults: 1
  }
];

const mockPropertyAlerts: PropertyAlert[] = [
  {
    id: '1',
    userId: 'user-1',
    name: 'Casas baratas em Sintra',
    location: 'Sintra',
    propertyType: 'house',
    minPrice: null,
    maxPrice: 500000,
    bedrooms: 3,
    bathrooms: 2,
    emailNotifications: true,
    smsNotifications: false,
    priceDropAlerts: true,
    newListingAlerts: true,
    isActive: true,
    createdAt: new Date('2024-01-10'),
    lastTriggered: new Date('2024-01-12'),
    matchCount: 12,
    newMatches: 2
  }
];

const mockViewHistory: ViewHistoryItem[] = [
  {
    id: '1',
    userId: 'user-1',
    propertyId: 'prop-123',
    propertyTitle: 'Casa T3 em Cascais',
    location: 'Cascais',
    price: 650000,
    viewedAt: new Date('2024-01-15T10:30:00'),
    viewCount: 3,
    propertyType: 'house',
    bedrooms: 3,
    bathrooms: 2
  },
  {
    id: '2',
    userId: 'user-1',
    propertyId: 'prop-456',
    propertyTitle: 'Apartamento T2 no Centro do Porto',
    location: 'Porto Centro',
    price: 380000,
    viewedAt: new Date('2024-01-14T16:45:00'),
    viewCount: 1,
    propertyType: 'apartment',
    bedrooms: 2,
    bathrooms: 1
  }
];

interface PersonalAreaProps {
  user: User;
  onPropertySelect: (property: Property) => void;
  onNavigateToAlertResults?: (alert: PropertyAlert) => void;
  favorites: Property[];
  onToggleFavorite: (property: Property) => void;
}

export function PersonalArea({ user, onPropertySelect, onNavigateToAlertResults, favorites, onToggleFavorite }: PersonalAreaProps) {
  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isNewAlertModalOpen, setIsNewAlertModalOpen] = useState(false);
  
  // Data state
  const [userAlerts, setUserAlerts] = useState<NewAlert[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  // Initialize saved searches from localStorage (fallback to mocks)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('hf_saved_searches');
      if (raw) {
        const parsed: any[] = JSON.parse(raw);
        const withDates: SavedSearch[] = parsed.map(s => ({
          ...s,
          createdAt: new Date(s.createdAt)
        }));
        setSavedSearches(withDates);
      } else {
        setSavedSearches(mockSavedSearches);
      }
    } catch {
      setSavedSearches(mockSavedSearches);
    }
  }, []);
  
  // Save searches to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('hf_saved_searches', JSON.stringify(savedSearches));
  }, [savedSearches]);

  const [mockAlertsStatus, setMockAlertsStatus] = useState<Record<string, boolean>>({
    '1': true // Default status for mock alert
  });
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    sms: false,
    priceAlerts: true,
    newListings: true,
    marketInsights: true,
    weeklyDigest: true,
    alertFrequency: 'immediate'
  });

  // Combined alerts (mock + user created) with current status
  const allAlerts = [
    ...mockPropertyAlerts.map(alert => ({
      ...alert,
      isActive: mockAlertsStatus[alert.id] ?? alert.isActive
    })),
    ...userAlerts.map(userAlert => ({
      id: userAlert.id,
      userId: user.id,
      name: userAlert.name,
      location: userAlert.location || null,
      propertyType: userAlert.propertyType || null,
      minPrice: userAlert.priceRange ? userAlert.priceRange[0] : null,
      maxPrice: userAlert.priceRange ? userAlert.priceRange[1] : null,
      bedrooms: userAlert.bedrooms || null,
      bathrooms: userAlert.bathrooms || null,
      emailNotifications: userAlert.emailNotifications ?? true,
      smsNotifications: userAlert.smsNotifications ?? false,
      priceDropAlerts: userAlert.priceDropAlerts ?? true,
      newListingAlerts: userAlert.newListingAlerts ?? true,
      isActive: userAlert.isActive ?? true,
      createdAt: new Date(),
      lastTriggered: null,
      matchCount: Math.floor(Math.random() * 20) + 1,
      newMatches: Math.floor(Math.random() * 5)
    }))
  ];

  // Handlers
  const handleCreateAlert = (alert: NewAlert) => {
    setUserAlerts(prev => [...prev, alert]);
    setIsNewAlertModalOpen(false);
    toast.success('Alerta criado com sucesso!', {
      description: `Você será notificado sobre propriedades que correspondem aos critérios definidos.`
    });
  };

  const handleDeleteAlert = (alertId: string) => {
    // Check if it's a user-created alert
    const userAlertIndex = userAlerts.findIndex(alert => alert.id === alertId);
    if (userAlertIndex !== -1) {
      setUserAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } else {
      // It's a mock alert, just hide it by setting isActive to false
      setMockAlertsStatus(prev => ({
        ...prev,
        [alertId]: false
      }));
    }
    
    toast.success('Alerta removido!');
  };

  const handleToggleAlert = (alertId: string) => {
    // Check if it's a user-created alert
    const userAlertIndex = userAlerts.findIndex(alert => alert.id === alertId);
    if (userAlertIndex !== -1) {
      setUserAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, isActive: !alert.isActive }
          : alert
      ));
    } else {
      // It's a mock alert
      setMockAlertsStatus(prev => ({
        ...prev,
        [alertId]: !prev[alertId]
      }));
    }
    
    const isActive = userAlertIndex !== -1 
      ? !userAlerts[userAlertIndex].isActive
      : !mockAlertsStatus[alertId];
      
    toast.success(isActive ? 'Alerta ativado!' : 'Alerta pausado!');
  };

  const handleDeleteSearch = (searchId: string) => {
    setSavedSearches(prev => prev.filter(search => search.id !== searchId));
    toast.success('Pesquisa removida!');
  };


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
            alertsCount={allAlerts.filter(alert => alert.isActive).length}
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
            user={user}
            savedSearches={savedSearches}
            onDeleteSearch={handleDeleteSearch}
            onPropertySelect={onPropertySelect}
          />
        </TabsContent>

        <TabsContent value="alerts">
          <PersonalAreaAlerts
            user={user}
            alerts={allAlerts}
            onCreateAlert={() => setIsNewAlertModalOpen(true)}
            onDeleteAlert={handleDeleteAlert}
            onToggleAlert={handleToggleAlert}
            onNavigateToAlertResults={onNavigateToAlertResults}
          />
        </TabsContent>

        <TabsContent value="history">
          <PersonalAreaHistory
            user={user}
            viewHistory={mockViewHistory}
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