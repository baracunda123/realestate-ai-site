import { useState, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { PersonalArea } from './components/PersonalArea';
import { Footer } from './components/Footer';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { type PropertyAlert } from './types/PersonalArea';
import { type SearchFilters as SearchFiltersType, DEFAULT_SEARCH_FILTERS } from './types/SearchFilters';
import { type Property } from './types/property';
import { getCurrentUser, logout, authUtils } from './api/auth.service';
import { createSafeDate } from './utils/PersonalArea';
import type { UserProfile } from './api/client';

// Lazy load components for better performance
const SearchFilters = lazy(() => import('./components/SearchFilters').then(m => ({ default: m.SearchFilters })));
const PropertyGrid = lazy(() => import('./components/PropertyGrid').then(m => ({ default: m.PropertyGrid })));
const PropertyModal = lazy(() => import('./components/PropertyModal').then(m => ({ default: m.PropertyModal })));
const MapView = lazy(() => import('./components/MapView').then(m => ({ default: m.MapView })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const WelcomeScreen = lazy(() => import('./components/WelcomeScreen').then(m => ({ default: m.WelcomeScreen })));
const PremiumFeaturesModal = lazy(() => import('./components/PremiumFeaturesModal').then(m => ({ default: m.PremiumFeaturesModal })));
const UpgradeModal = lazy(() => import('./components/UpgradeModal').then(m => ({ default: m.UpgradeModal })));
const AlertResults = lazy(() => import('./components/AlertResults').then(m => ({ default: m.AlertResults })));

// View types
type ViewType = 'home' | 'personal' | 'alert-results';
type ViewMode = 'grid' | 'map';
type AuthTab = 'signin' | 'signup';
type SignupIntent = 'free' | 'premium' | null;

// Extended user interface para uso interno com BD UserProfile
interface ExtendedUserProfile extends UserProfile {
  // Campos adicionais calculados para compatibilidade
  name?: string;
  phone?: string;
  avatar?: string;
  isPremium?: boolean;
}

export default function App() {
  // Property-related state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [searchResults, setSearchResults] = useState<Property[] | null>(null);
  
  // Search and filter state - usando novos tipos
  const [searchFilters, setSearchFilters] = useState<SearchFiltersType>(DEFAULT_SEARCH_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Navigation state
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedAlert, setSelectedAlert] = useState<PropertyAlert | null>(null);
  
  // AI state
  const [aiText, setAiText] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Authentication state - usando novos tipos
  const [user, setUser] = useState<ExtendedUserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<AuthTab>('signin');
  const [signupIntent, setSignupIntent] = useState<SignupIntent>(null);
  
  // Modal state
  const [isPremiumFeaturesModalOpen, setIsPremiumFeaturesModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Initialize authentication and favorites
  useEffect(() => {
    const initializeApp = async () => {
      // Check authentication
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          // Extend user profile com campos calculados para compatibilidade
          const extendedUser: ExtendedUserProfile = {
            ...currentUser,
            name: currentUser.fullName || currentUser.name || '',
            phone: currentUser.phoneNumber || '',
            avatar: currentUser.avatarUrl,
            isPremium: determineIfPremium(currentUser.subscription) // Função helper
          };
          setUser(extendedUser);
        }
      } catch {
        // Silenciar erro de inicialização
        authUtils.clearTokens();
      }

      // Load favorites from localStorage
      try {
        const savedFavorites = localStorage.getItem('hf_favorites');
        if (savedFavorites) {
          const parsed = JSON.parse(savedFavorites);
          // Validar estrutura dos favoritos
          if (Array.isArray(parsed)) {
            setFavorites(parsed.filter(fav => fav && fav.id));
          }
        }
      } catch {
        // Silenciar erro de favoritos
        setFavorites([]);
      }
    };

    initializeApp();
  }, []);

  // Helper function para determinar se usuário é premium
  const determineIfPremium = (subscription: string | undefined): boolean => {
    if (!subscription) return false;
    const sub = subscription.toLowerCase();
    return sub === 'premium' || sub === 'pro' || sub.includes('paid');
  };

  // Persist favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('hf_favorites', JSON.stringify(favorites));
    } catch {
      // Silenciar erro de localStorage
    }
  }, [favorites]);

  // Handle URL navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      
      if (hash === '#personal' && user) {
        setCurrentView('personal');
      } else if (hash === '#alert-results' && user && selectedAlert) {
        setCurrentView('alert-results');
      } else if (hash === '#alert-results' && user && !selectedAlert) {
        // Redirect to personal if trying to access alert results without selected alert
        setCurrentView('personal');
        window.location.hash = '#personal';
      } else {
        setCurrentView('home');
        if (hash && hash !== '#') {
          window.location.hash = '';
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check initial hash

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user, selectedAlert]);

  // Redirect to home if user logs out while in protected views
  useEffect(() => {
    if (!user && (currentView === 'personal' || currentView === 'alert-results')) {
      setCurrentView('home');
      setSelectedAlert(null);
      window.location.hash = '';
    }
  }, [user, currentView]);

  // Helper functions
  const isDefaultState = (): boolean => {
    const isDefaultFilters = 
      searchFilters.location === '' &&
      searchFilters.priceRange[0] === 0 &&
      searchFilters.priceRange[1] === 2000000 &&
      searchFilters.bedrooms === null &&
      searchFilters.bathrooms === null &&
      searchFilters.propertyType === 'any' &&
      searchFilters.sortBy === 'price';
    
    return searchQuery.trim() === '' && isDefaultFilters;
  };

  const resetToDefaults = () => {
    setSearchQuery('');
    setSearchFilters(DEFAULT_SEARCH_FILTERS);
    setSearchResults(null);
    setAiText('');
    setAiError(null);
  };

  // Navigation handlers
  const navigateToPersonalArea = () => {
    if (user) {
      setCurrentView('personal');
      window.location.hash = '#personal';
    } else {
      openAuthModal();
    }
  };

  const navigateToHome = () => {
    setCurrentView('home');
    window.location.hash = '';
  };

  const navigateToAlertResults = (alert: PropertyAlert) => {
    setSelectedAlert(alert);
    setCurrentView('alert-results');
    window.location.hash = '#alert-results';
  };

  const navigateBackFromAlertResults = () => {
    setSelectedAlert(null);
    setCurrentView('personal');
    window.location.hash = '#personal';
  };

  // Property handlers
  const toggleFavorite = (property: Property) => {
    const exists = favorites.some(p => p.id === property.id);
    
    if (!exists) {
      if (!user) {
        openAuthModal();
        return;
      }
      
      // Simple limit check for favorites
      const maxFavorites = user.isPremium ? Infinity : 5;
      if (favorites.length >= maxFavorites) {
        toast.error('Limite de favoritos atingido', {
          description: `Plano gratuito permite até ${maxFavorites} favoritos. Faça upgrade para favoritos ilimitados.`,
        });
        return;
      }
    }
    
    setFavorites(prev => 
      exists 
        ? prev.filter(p => p.id !== property.id) 
        : [...prev, property]
    );

    toast.success(exists ? 'Removido dos favoritos' : 'Adicionado aos favoritos', {
      description: property.title || 'Propriedade atualizada',
    });
  };

  // Search handlers
  const handleExampleSearch = (query: string) => {
    if (!user) {
      openAuthModal();
      return;
    }
    setSearchQuery(query);
    setCurrentView('home');
    window.location.hash = '';
    toast.success('Pesquisa iniciada!', {
      description: `Pesquisando: "${query}"`,
    });
  };

  const handleSubmitSearch = async (query: string) => {
    setAiLoading(true);
    setAiError(null);
    
    try {
      const { searchProperties } = await import('./api/properties.service');
      const result = await searchProperties({ 
        searchQuery: query,
        includeAiAnalysis: true,
        includeMarketData: user?.isPremium || false
      });
      
      setSearchResults(result.properties || []);
      setAiText(result.aiResponse || '');
      setSearchQuery(query);
      
      if (currentView !== 'home') setCurrentView('home');
      if (window.location.hash) window.location.hash = '';
      
      if (result.properties?.length === 0) {
        toast.info('Nenhum resultado encontrado', { 
          description: 'IA fornecerá sugestões mesmo sem listagens.' 
        });
      } else {
        toast.success(`${result.properties.length} propriedades encontradas`, {
          description: 'Resultados carregados com análise da IA',
        });
      }
    } catch {
      setSearchResults([]);
      setAiText('');
      setAiError('Não foi possível obter resposta da IA no momento.');
      setSearchQuery(query);
      
      if (currentView !== 'home') setCurrentView('home');
      if (window.location.hash) window.location.hash = '';
      
      toast.error('Erro na pesquisa', {
        description: 'Tente novamente em alguns instantes.',
      });
    } finally {
      setAiLoading(false);
    }
  };

  // Authentication handlers
  const handleAuthSuccess = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const extendedUser: ExtendedUserProfile = {
          ...currentUser,
          name: currentUser.fullName || currentUser.name || '',
          phone: currentUser.phoneNumber || '',
          avatar: currentUser.avatarUrl,
          isPremium: determineIfPremium(currentUser.subscription)
        };
        setUser(extendedUser);
        
        // Handle premium signup intent
        if (signupIntent === 'premium' && !extendedUser.isPremium) {
          setSignupIntent(null);
          setTimeout(() => setIsUpgradeModalOpen(true), 500);
        }

        toast.success(`Bem-vindo, ${currentUser.fullName || currentUser.name || 'usuário'}!`, {
            description: 'Inicio de sessão efetuado com sucesso.',
        });
      }
    } catch {
      toast.error('Erro ao carregar dados do usuário');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setCurrentView('home');
      resetToDefaults();
      window.location.hash = '';
      
      toast.success('Logout realizado com sucesso!', {
        description: 'Até breve!',
      });
    } catch {
      authUtils.clearTokens();
      setUser(null);
      toast.error('Erro no logout, mas desconectado localmente.');
    }
  };

  // Modal handlers
  const openAuthModal = (tab: AuthTab = 'signin', intent: SignupIntent = null) => {
    setAuthDefaultTab(tab);
    setSignupIntent(intent);
    setIsAuthModalOpen(true);
  };

  const openPremiumFeaturesModal = () => {
    setIsPremiumFeaturesModalOpen(true);
  };

  const openUpgradeModal = () => {
    setIsPremiumFeaturesModalOpen(false);
    setIsUpgradeModalOpen(true);
  };

  const handleBackToPremiumFeatures = () => {
    setIsUpgradeModalOpen(false);
    setIsPremiumFeaturesModalOpen(true);
  };

  const handleUpgradeComplete = () => {
    if (user) {
      setUser({ ...user, isPremium: true });
      toast.success('Upgrade realizado com sucesso!', {
        description: 'Bem-vindo ao Premium! Todas as funcionalidades desbloqueadas.',
      });
    }
    
    setIsUpgradeModalOpen(false);
    setIsPremiumFeaturesModalOpen(false);
  };

  // Generate mock properties for alert results
  const generateAlertProperties = (alert: PropertyAlert): Property[] => {
    const mockProperties: Property[] = [
      {
        id: 'alert-1',
        title: `Apartamento Moderno em ${alert.location}`,
        description: `Propriedade encontrada através do seu alerta "${alert.name}". Corresponde perfeitamente aos seus critérios!`,
        type: alert.propertyType,
        price: alert.minPrice ? alert.minPrice + ((alert.maxPrice || alert.minPrice) - alert.minPrice) * 0.3 : 950000,
        address: `123 Rua Principal, ${alert.location}`,
        city: alert.location || 'Lisboa',
        state: 'Portugal',
        county: null,
        civilParish: null,
        zipCode: '1000-001',
        area: 120,
        usableArea: 100,
        bedrooms: alert.bedrooms || 2,
        bathrooms: alert.bathrooms || 2,
        garage: true,
        imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
        link: '#',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Campos calculados
        location: alert.location || 'Lisboa',
        images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'],
        features: ['Corresponde ao Alerta', 'Recém Listado', 'Vista Panorâmica', 'Garagem'],
        yearBuilt: 2020,
        propertyType: (alert.propertyType as 'apartment' | 'house' | 'condo') || 'apartment',
        listingAgent: {
          name: 'Ana Silva',
          phone: '(+351) 91 234 5678',
          email: 'ana@alertproperties.com'
        }
      },
      {
        id: 'alert-2',
        title: `Casa Premium em ${alert.location}`,
        description: `Propriedade exclusiva que atende todos os critérios do seu alerta "${alert.name}". Nova no mercado!`,
        type: alert.propertyType,
        price: alert.maxPrice ? alert.maxPrice * 0.7 : 1350000,
        address: `456 Avenida Central, ${alert.location}`,
        city: alert.location || 'Lisboa',
        state: 'Portugal',
        county: null,
        civilParish: null,
        zipCode: '1000-002',
        area: 160,
        usableArea: 140,
        bedrooms: (alert.bedrooms || 2) + 1,
        bathrooms: alert.bathrooms || 2,
        garage: true,
        imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
        link: '#',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Campos calculados
        location: alert.location || 'Lisboa',
        images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop'],
        features: ['Correspondência Perfeita', 'Acabamentos Premium', 'Localização Prime', 'Piscina'],
        yearBuilt: 2021,
        propertyType: (alert.propertyType as 'apartment' | 'house' | 'condo') || 'house',
        listingAgent: {
          name: 'Carlos Santos',
          phone: '(+351) 92 345 6789',
          email: 'carlos@alertproperties.com'
        }
      }
    ];

    return mockProperties.slice(0, alert.newMatches || 2);
  };

  // Convert extended user to regular user for components that need it
  const convertToUser = (extendedUser: ExtendedUserProfile) => ({
    id: extendedUser.id,
    email: extendedUser.email,
    fullName: extendedUser.fullName,
    name: extendedUser.name || extendedUser.fullName || '',
    phone: extendedUser.phone || extendedUser.phoneNumber || '',
    avatar: extendedUser.avatar || extendedUser.avatarUrl,
    avatarUrl: extendedUser.avatarUrl,
    phoneNumber: extendedUser.phoneNumber,
    subscription: extendedUser.subscription,
    credits: extendedUser.credits,
    isPremium: extendedUser.isPremium || false,
    isEmailVerified: extendedUser.isEmailVerified,
    createdAt: createSafeDate(extendedUser.createdAt),
    updatedAt: extendedUser.updatedAt ? createSafeDate(extendedUser.updatedAt) : undefined
  });

  // Determine if welcome screen should be shown
  const showWelcomeScreen = !user || (user && isDefaultState() && currentView === 'home');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        searchQuery={searchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        user={user}
        onOpenAuth={openAuthModal}
        onLogout={handleLogout}
        onNavigateToPersonal={navigateToPersonalArea}
        onNavigateToHome={navigateToHome}
        currentView={currentView}
        onOpenUpgradeModal={openUpgradeModal}
        onSubmitSearch={handleSubmitSearch}
        aiText={aiText}
        aiLoading={aiLoading}
        aiError={aiError}
      />
      
      <main className="flex-1 site-container py-8">
        {currentView === 'alert-results' && user && selectedAlert ? (
          <Suspense fallback={<div>Carregando resultados...</div>}>
            <AlertResults
              alert={selectedAlert}
              properties={generateAlertProperties(selectedAlert)}
              onBack={navigateBackFromAlertResults}
              onPropertySelect={setSelectedProperty}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
            />
          </Suspense>
        ) : currentView === 'personal' && user ? (
          <PersonalArea
            user={convertToUser(user)}
            onPropertySelect={setSelectedProperty}
            onOpenUpgradeModal={openUpgradeModal}
            onNavigateToAlertResults={navigateToAlertResults}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        ) : showWelcomeScreen ? (
          <Suspense fallback={<div>Carregando...</div>}>
            <WelcomeScreen
              onExampleSearch={handleExampleSearch}
              onOpenPremiumFeatures={openPremiumFeaturesModal}
              user={user}
              onStartFreeSignup={() => openAuthModal('signup', 'free')}
              onStartPremiumSignup={() => openAuthModal('signup', 'premium')}
            />
          </Suspense>
        ) : (
          user && (
            <Suspense fallback={<div>Carregando propriedades...</div>}>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <SearchFilters
                    filters={searchFilters}
                    setFilters={setSearchFilters}
                  />
                </div>
                <div className="lg:col-span-3">
                  {viewMode === 'grid' ? (
                    <PropertyGrid
                      filters={searchFilters}
                      searchQuery={searchQuery}
                      serverResults={searchResults || undefined}
                      onPropertySelect={setSelectedProperty}
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                    />
                  ) : (
                    <MapView
                      filters={searchFilters}
                      searchQuery={searchQuery}
                      onPropertySelect={setSelectedProperty}
                    />
                  )}
                </div>
              </div>
            </Suspense>
          )
        )}
      </main>

      <Footer />

      {/* Modals */}
      {selectedProperty && (
        <Suspense fallback={null}>
          <PropertyModal
            property={selectedProperty}
            onClose={() => setSelectedProperty(null)}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          defaultTab={authDefaultTab}
        />
      </Suspense>

      <Suspense fallback={null}>
        <PremiumFeaturesModal
          isOpen={isPremiumFeaturesModalOpen}
          onClose={() => setIsPremiumFeaturesModalOpen(false)}
          onUpgrade={openUpgradeModal}
        />
      </Suspense>

      <Suspense fallback={null}>
        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          onBack={handleBackToPremiumFeatures}
          onUpgradeComplete={handleUpgradeComplete}
        />
      </Suspense>

      <Toaster richColors position="top-right" />
    </div>
  );
}
