import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { AISuggestions } from './components/AISuggestions';
import { PersonalArea } from './components/PersonalArea';
import { Footer } from './components/Footer';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { type PropertyAlert } from './types/PersonalArea';
import { type SearchFilters as SearchFiltersType } from './types/SearchFilters';
import { type Property } from './types/property';
import { getCurrentLimits } from './utils/PersonalArea';

const SearchFilters = lazy(() => import('./components/SearchFilters').then(m => ({ default: m.SearchFilters })));
const PropertyGrid = lazy(() => import('./components/PropertyGrid').then(m => ({ default: m.PropertyGrid })));
const PropertyModal = lazy(() => import('./components/PropertyModal').then(m => ({ default: m.PropertyModal })));
const MapView = lazy(() => import('./components/MapView').then(m => ({ default: m.MapView })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const WelcomeScreen = lazy(() => import('./components/WelcomeScreen').then(m => ({ default: m.WelcomeScreen })));
const PremiumFeaturesModal = lazy(() => import('./components/PremiumFeaturesModal').then(m => ({ default: m.PremiumFeaturesModal })));
const UpgradeModal = lazy(() => import('./components/UpgradeModal').then(m => ({ default: m.UpgradeModal })));
const AlertResults = lazy(() => import('./components/AlertResults').then(m => ({ default: m.AlertResults })));


interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  isPremium?: boolean;
  createdAt: Date;
}

export default function App() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFiltersType>({
    priceRange: [0, 2000000],
    bedrooms: null,
    bathrooms: null,
    propertyType: '',
    location: '',
    sortBy: 'price'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentView, setCurrentView] = useState<'home' | 'personal' | 'alert-results'>('home');
  const [selectedAlert, setSelectedAlert] = useState<PropertyAlert | null>(null);
  const [searchResults, setSearchResults] = useState<Property[] | null>(null);
  
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Premium upgrade modals state
  const [isPremiumFeaturesModalOpen, setIsPremiumFeaturesModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Handle URL navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      
      if (hash === '#personal' && user) {
        setCurrentView('personal');
      } else if (hash === '#alert-results' && user && selectedAlert) {
        setCurrentView('alert-results');
      } else if (hash === '#alert-results' && user && !selectedAlert) {
        // If trying to access alert results but no alert selected, go to personal
        setCurrentView('personal');
        window.location.hash = '#personal';
      } else if (!hash || hash === '#' || !user) {
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

  // Redirect to home if user logs out while in personal area or alert results
  useEffect(() => {
    if (!user && (currentView === 'personal' || currentView === 'alert-results')) {
      setCurrentView('home');
      setSelectedAlert(null);
      window.location.hash = '';
    }
  }, [user, currentView]);

  // Function to update filters (can be used by AI)
  const updateFilters = (newFilters: Partial<SearchFiltersType>) => {
    if (!user) {
      openAuthModal();
      return;
    }
    setSearchFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
  };

  // Check if we should show welcome screen - always show for non-logged users
  const isDefaultState = () => {
    const isDefaultFilters = 
      searchFilters.priceRange[0] === 0 &&
      searchFilters.priceRange[1] === 2000000 &&
      searchFilters.bedrooms === null &&
      searchFilters.bathrooms === null &&
      searchFilters.propertyType === '' &&
      searchFilters.location === '' &&
      searchFilters.sortBy === 'price';
    
    return searchQuery.trim() === '' && isDefaultFilters;
  };

  // Persist favorites in localStorage
  useEffect(() => {
    const raw = localStorage.getItem('hf_favorites');
    if (raw) {
      try { setFavorites(JSON.parse(raw)); } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('hf_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (property: Property) => {
    // Limits only enforce on add
    const exists = favorites.some(p => p.id === property.id);
    if (!exists) {
      if (!user) {
        openAuthModal();
        return;
      }
      const limits = getCurrentLimits(user as any);
      if (!user.isPremium && favorites.length >= limits.maxFavorites) {
        toast.error('Limite de favoritos atingido', {
          description: `Plano Free permite até ${limits.maxFavorites}. Faça upgrade para ilimitados.`,
        });
        return;
      }
    }
    setFavorites(prev => exists ? prev.filter(p => p.id !== property.id) : [...prev, property]);
  };

  // Handle example search from welcome screen
  const handleExampleSearch = (query: string) => {
    if (!user) {
      openAuthModal();
      return;
    }
    setSearchQuery(query);
    setCurrentView('home');
    window.location.hash = '';
    toast.success('Pesquisa iniciada!', {
      description: `A pesquisar: "${query}"`,
    });
  };

  // Navigation handler
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

  // Generate mock properties for alert results
  const generateAlertProperties = (alert: PropertyAlert): Property[] => {
    const mockProperties: Property[] = [
      {
        id: 'alert-1',
        title: `Apartamento Moderno em ${alert.location}`,
        price: alert.priceRange[0] + (alert.priceRange[1] - alert.priceRange[0]) * 0.3,
        bedrooms: alert.bedrooms || 2,
        bathrooms: alert.bathrooms || 2,
        area: 1200,
        location: alert.location,
        address: `123 Rua Principal, ${alert.location}`,
        images: [
          'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1562663474-6cbb3eaa4d14?w=800&h=600&fit=crop'
        ],
        description: `Propriedade encontrada através do seu alerta "${alert.name}". Corresponde perfeitamente aos seus critérios!`,
        features: ['Corresponde ao Alerta', 'Recém Listado', 'Vista Panorâmica', 'Garagem'],
        yearBuilt: 2020,
        propertyType: alert.propertyType as any,
        listingAgent: {
          name: 'Ana Silva',
          phone: '(11) 99999-1111',
          email: 'ana@alertaimoveis.com'
        }
      },
      {
        id: 'alert-2',
        title: `${alert.propertyType === 'house' ? 'Casa' : 'Apartamento'} Premium ${alert.location}`,
        price: alert.priceRange[0] + (alert.priceRange[1] - alert.priceRange[0]) * 0.7,
        bedrooms: (alert.bedrooms || 2) + 1,
        bathrooms: (alert.bathrooms || 2),
        area: 1600,
        location: alert.location,
        address: `456 Av. Central, ${alert.location}`,
        images: [
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
          'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop'
        ],
        description: `Exclusiva propriedade que atende todos os critérios do seu alerta "${alert.name}". Nova no mercado!`,
        features: ['Match Perfeito', 'Acabamento Premium', 'Localização Privilegiada', 'Piscina'],
        yearBuilt: 2021,
        propertyType: alert.propertyType as any,
        listingAgent: {
          name: 'Carlos Santos',
          phone: '(11) 99999-2222',
          email: 'carlos@alertaimoveis.com'
        }
      }
    ];

    return mockProperties.slice(0, alert.newMatches || 2);
  };

  // Authentication handlers
  const handleSignIn = (email: string, password: string) => {
    // Mock authentication
    const mockUser: User = {
      id: '1',
      name: 'João Silva',
      email: email,
      phone: '(11) 99999-9999',
      isPremium: false,  // Set to Free to test limitations
      createdAt: new Date()
    };
    
    setUser(mockUser);
    setIsAuthModalOpen(false);
    toast.success(`Bem-vindo de volta, ${mockUser.name}!`, {
      description: 'Sessão iniciada com sucesso.',
    });
  };

  const handleSignUp = (name: string, email: string, phone: string, password: string) => {
    // Mock registration
    const mockUser: User = {
      id: Date.now().toString(),
      name: name,
      email: email,
      phone: phone,
      isPremium: false,
      createdAt: new Date()
    };
    
    setUser(mockUser);
    setIsAuthModalOpen(false);
    toast.success(`Conta criada com sucesso!`, {
      description: `Bem-vindo ao HomeFinder AI, ${mockUser.name}!`,
    });
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('home');
    setSearchQuery(''); // Clear search when logging out
    // Reset filters to default
    setSearchFilters({
      priceRange: [0, 2000000],
      bedrooms: null,
      bathrooms: null,
      propertyType: '',
      location: '',
      sortBy: 'price'
    });
    window.location.hash = '';
    toast.success('Sessão terminada com sucesso!', {
      description: 'Até logo! Esperamos vê-lo em breve.',
    });
  };

  // Modal handlers
  const openAuthModal = () => {
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
    // Update user to premium
    if (user) {
      setUser({
        ...user,
        isPremium: true
      });
      
      toast.success('Upgrade realizado com sucesso!', {
        description: 'Bem-vindo ao Premium! Todas as funcionalidades foram desbloqueadas.',
      });
    }
    
    setIsUpgradeModalOpen(false);
    setIsPremiumFeaturesModalOpen(false);
  };

  // Show welcome screen for non-logged users OR logged users with default state
  const showWelcomeScreen = !user || (user && isDefaultState() && currentView === 'home');

  // Block search functionality for non-logged users
  const handleSearchQueryChange = (query: string) => {
    if (!user) {
      openAuthModal();
      return;
    }
    setSearchQuery(query);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        searchQuery={searchQuery}
        setSearchQuery={handleSearchQueryChange}
        viewMode={viewMode}
        setViewMode={setViewMode}
        user={user}
        onOpenAuth={openAuthModal}
        onLogout={handleLogout}
        onNavigateToPersonal={navigateToPersonalArea}
        onNavigateToHome={navigateToHome}
        currentView={currentView}
        onOpenUpgradeModal={openUpgradeModal}
        onSubmitSearch={async (q) => {
          try {
            const { searchProperties } = await import('./api/properties.service');
            const res = await searchProperties({ searchQuery: q });
            const props = res.properties || [];
            setSearchResults(props);
            setSearchQuery(q);
            setCurrentView('home');
            window.location.hash = '';
            if (props.length === 0) {
              toast.info('Sem resultados', { description: 'A IA responderá com dicas mesmo sem listagens.' });
            }
          } catch {
            setSearchResults([]);
            setSearchQuery(q);
            setCurrentView('home');
            window.location.hash = '';
            // aviso de falha removido a pedido do utilizador
          }
        }}
      />
      
      <main className="flex-1 site-container py-8">
        {currentView === 'alert-results' && user && selectedAlert ? (
          <div className="site-container">
            <Suspense fallback={null}>
              <AlertResults
                alert={selectedAlert}
                properties={generateAlertProperties(selectedAlert)}
                onBack={navigateBackFromAlertResults}
                onPropertySelect={setSelectedProperty}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
              />
            </Suspense>
          </div>
        ) : currentView === 'personal' && user ? (
          <PersonalArea
            user={user}
            onPropertySelect={setSelectedProperty}
            onOpenUpgradeModal={openUpgradeModal}
            onNavigateToAlertResults={navigateToAlertResults}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        ) : showWelcomeScreen ? (
          <div className="site-container">
            <Suspense fallback={null}>
              <WelcomeScreen
                onExampleSearch={handleExampleSearch}
                onOpenPremiumFeatures={openPremiumFeaturesModal}
                user={user}
              />
            </Suspense>
          </div>
        ) : (
          user && (
            <Suspense fallback={null}>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <SearchFilters
                    filters={searchFilters}
                    setFilters={setSearchFilters}
                  />
                  <AISuggestions searchQuery={searchQuery} user={user} />
                </div>
                <div className="lg:col-span-3">
                  {viewMode === 'grid' ? (
                    <PropertyGrid
                    filters={searchFilters}
                    searchQuery={searchQuery}
                    serverResults={searchResults || undefined}
                    onPropertySelect={setSelectedProperty}
                    onFiltersUpdate={updateFilters}
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

      {/* Footer Fixo */}
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
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
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

      {/* Toast Notifications */}
      <Toaster richColors position="top-right" />
    </div>
  );
}
