import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
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
import { getFavoriteProperties, addToFavorites, removeFromFavorites } from './api/favorites.service';

// Lazy load components for better performance
const SearchFilters = lazy(() => import('./components/SearchFilters').then(m => ({ default: m.SearchFilters })));
const PropertyGrid = lazy(() => import('./components/PropertyGrid').then(m => ({ default: m.PropertyGrid })));
const MapView = lazy(() => import('./components/MapView').then(m => ({ default: m.MapView })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const WelcomeScreen = lazy(() => import('./components/WelcomeScreen').then(m => ({ default: m.WelcomeScreen })));

// Loading components otimizados
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-burnt-peach"></div>
  </div>
);

// View types (removido 'alert-results')
type ViewType = 'home' | 'personal';
type ViewMode = 'grid' | 'map';
type AuthTab = 'signin' | 'signup';

// Extended user interface para uso interno com BD UserProfile
interface ExtendedUserProfile extends UserProfile {
  // Campos adicionais calculados para compatibilidade
  name?: string;
  phone?: string;
  avatar?: string;
}

export default function App() {
  // Property-related state
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [searchResults, setSearchResults] = useState<Property[] | null>(null);
  
  // Search and filter state - usando novos tipos
  const [searchFilters, setSearchFilters] = useState<SearchFiltersType>(DEFAULT_SEARCH_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Navigation state (simplificado)
  const [currentView, setCurrentView] = useState<ViewType>('home');
  
  // AI state
  const [aiText, setAiText] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Authentication state - usando novos tipos
  const [user, setUser] = useState<ExtendedUserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<AuthTab>('signin');
  
  // Memoized values para evitar recálculos
  const isDefaultState = useMemo((): boolean => {
    const isDefaultFilters = 
      searchFilters.location === '' &&
      searchFilters.priceRange[0] === 0 &&
      searchFilters.priceRange[1] === 2000000 &&
      searchFilters.bedrooms === null &&
      searchFilters.bathrooms === null &&
      searchFilters.propertyType === 'any' &&
      searchFilters.sortBy === 'price';
    
    return searchQuery.trim() === '' && isDefaultFilters;
  }, [searchFilters, searchQuery]);

  const showWelcomeScreen = useMemo(() => 
    !user || (user && isDefaultState && currentView === 'home' && searchResults === null), 
    [user, isDefaultState, currentView, searchResults]
  );

  // Load favorites when user logs in
  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }
    
    try {
      const userFavorites = await getFavoriteProperties();
      setFavorites(userFavorites);
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
      setFavorites([]);
    }
  }, [user]);

  // Initialize authentication
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          const extendedUser: ExtendedUserProfile = {
            ...currentUser,
            name: currentUser.fullName || currentUser.name || '',
            phone: currentUser.phoneNumber || '',
            avatar: currentUser.avatarUrl,
          };
          setUser(extendedUser);
        }
      } catch {
        authUtils.clearTokens();
      }
    };

    initializeApp();
  }, []);

  // Load favorites when user changes
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Handle URL navigation (simplificado)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      
      if (hash === '#personal' && user) {
        setCurrentView('personal');
      } else {
        setCurrentView('home');
        if (hash && hash !== '#') {
          window.location.hash = '';
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user]);

  // Redirect to home if user logs out while in protected views
  useEffect(() => {
    if (!user && currentView === 'personal') {
      setCurrentView('home');
      window.location.hash = '';
    }
  }, [user, currentView]);

  // Optimized callbacks
  const resetToDefaults = useCallback(() => {
    setSearchQuery('');
    setSearchFilters(DEFAULT_SEARCH_FILTERS);
    setSearchResults(null);
    setAiText('');
    setAiError(null);
  }, []);

  // Navigation handlers - memoizados
  const navigateToPersonalArea = useCallback(() => {
    if (user) {
      setCurrentView('personal');
      window.location.hash = '#personal';
    } else {
      setAuthDefaultTab('signin');
      setIsAuthModalOpen(true);
    }
  }, [user]);

  const navigateToHome = useCallback(( reset: boolean = true ) => {
    if (reset) {
      resetToDefaults();
    }
    setCurrentView('home');
    window.location.hash = '';
  }, [resetToDefaults]);

  // Simplified navigation for alert results (now just shows a toast message)
  const navigateToAlertResults = useCallback((alert: PropertyAlert) => {
    toast.info('Funcionalidade em desenvolvimento', {
      description: `Ver resultados do alerta "${alert.name}" estará disponível em breve.`
    });
  }, []);

  // Property handlers - usando API
  const toggleFavorite = useCallback(async (property: Property) => {
    if (!user) {
      setAuthDefaultTab('signin');
      setIsAuthModalOpen(true);
      return;
    }
    
    const isFav = favorites.some(p => p.id === property.id);
    
    try {
      if (isFav) {
        const success = await removeFromFavorites(property.id);
        if (success) {
          setFavorites(prev => prev.filter(p => p.id !== property.id));
          toast.success('Removido dos favoritos', {
            description: property.title || 'Propriedade removida'
          });
        }
      } else {
        const success = await addToFavorites(property.id);
        if (success) {
          setFavorites(prev => [...prev, property]);
          toast.success('Adicionado aos favoritos', {
            description: property.title || 'Propriedade adicionada'
          });
        }
      }
    } catch {
      toast.error('Erro ao alterar favorito', {
        description: 'Tente novamente'
      });
    }
  }, [favorites, user]);

  // Search handlers - otimizados
  const handleExampleSearch = useCallback((query: string) => {
    if (!user) {
      setAuthDefaultTab('signin');
      setIsAuthModalOpen(true);
      return;
    }
    setSearchQuery(query);
    setCurrentView('home');
    window.location.hash = '';
    toast.success('Pesquisa iniciada!', {
      description: `Pesquisando: "${query}"`,
    });
  }, [user]);

  const handleSubmitSearch = useCallback(async (query: string, filters?: SearchFiltersType) => {
    setAiLoading(true);
    setAiError(null);
    
    try {
      const { searchProperties } = await import('./api/properties.service');
      const result = await searchProperties({ 
        searchQuery: query,
        includeAiAnalysis: true,
        includeMarketData: true
      });
      
      setSearchResults(result.properties || []);
      setAiText(result.aiResponse || '');
      setSearchQuery(query);
      
      if (filters) {
        setSearchFilters(filters);
      }
      
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
      
      if (filters) {
        setSearchFilters(filters);
      }
      
      if (currentView !== 'home') setCurrentView('home');
      if (window.location.hash) window.location.hash = '';
      
      toast.error('Erro na pesquisa', {
        description: 'Tente novamente em alguns instantes.',
      });
    } finally {
      setAiLoading(false);
    }
  }, [currentView]);

  // Authentication handlers - otimizados
  const handleAuthSuccess = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const extendedUser: ExtendedUserProfile = {
          ...currentUser,
          name: currentUser.fullName || currentUser.name || '',
          phone: currentUser.phoneNumber || '',
          avatar: currentUser.avatarUrl
        };
        setUser(extendedUser);

        toast.success(`Bem-vindo, ${currentUser.fullName || currentUser.name || 'utilizador'}!`, {
            description: 'Inicio de sessão efetuado com sucesso.',
        });
      }
    } catch {
      toast.error('Erro ao carregar dados do utilizador');
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setUser(null);
      setFavorites([]);
      setCurrentView('home');
      resetToDefaults();
      window.location.hash = '';
      
      toast.success('Logout realizado com sucesso!', {
        description: 'Até breve!',
      });
    } catch {
      authUtils.clearTokens();
      setUser(null);
      setFavorites([]);
      toast.error('Erro no logout, mas desconectado localmente.');
    }
  }, [resetToDefaults]);

  // Modal handlers - otimizados
  const openAuthModal = useCallback((tab: AuthTab = 'signin') => {
    setAuthDefaultTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  // Convert extended user to regular user for components that need it - memoizado
  const convertToUser = useCallback((extendedUser: ExtendedUserProfile) => ({
    id: extendedUser.id,
    email: extendedUser.email,
    fullName: extendedUser.fullName,
    name: extendedUser.name || extendedUser.fullName || '',
    phone: extendedUser.phone || extendedUser.phoneNumber || '',
    avatar: extendedUser.avatar || extendedUser.avatarUrl,
    avatarUrl: extendedUser.avatarUrl,
    phoneNumber: extendedUser.phoneNumber,
    isEmailVerified: extendedUser.isEmailVerified,
    createdAt: createSafeDate(extendedUser.createdAt),
    updatedAt: extendedUser.updatedAt ? createSafeDate(extendedUser.updatedAt) : undefined
  }), []);

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
        onSubmitSearch={handleSubmitSearch}
        aiText={aiText}
        aiLoading={aiLoading}
        aiError={aiError}
      />
      
      <main className="flex-1 site-container py-8">
        {currentView === 'personal' && user ? (
          <PersonalArea
            user={convertToUser(user)}
            onNavigateToAlertResults={navigateToAlertResults}
            onNavigateToHome={navigateToHome}
            onExecuteSearch={handleSubmitSearch}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            hasActiveSearch={!isDefaultState && searchResults !== null}
          />
        ) : showWelcomeScreen ? (
          <Suspense fallback={<LoadingSpinner />}>
            <WelcomeScreen
              onExampleSearch={handleExampleSearch}
              user={user ? convertToUser(user) : null}
              onStartSignup={() => openAuthModal('signup')}
            />
          </Suspense>
        ) : (
          user && (
            <Suspense fallback={<LoadingSpinner />}>
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
                      favorites={favorites}
                      onToggleFavorite={toggleFavorite}
                    />
                  ) : (
                    <MapView
                      filters={searchFilters}
                      searchQuery={searchQuery}
                      onPropertySelect={() => {}} // Desabilitado temporariamente
                    />
                  )}
                </div>
              </div>
            </Suspense>
          )
        )}
      </main>

      <Footer />

      <Suspense fallback={null}>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          defaultTab={authDefaultTab}
        />
      </Suspense>

      <Toaster richColors position="top-right" />
    </div>
  );
}
