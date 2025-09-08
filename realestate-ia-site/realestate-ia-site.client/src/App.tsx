import { useState, useEffect, lazy, Suspense } from 'react';
import { Header } from './components/Header';
import { PersonalArea } from './components/PersonalArea';
import { Footer } from './components/Footer';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { type PropertyAlert } from './types/PersonalArea';
import { type SearchFilters as SearchFiltersType } from './types/SearchFilters';
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

// Default search filters
const DEFAULT_FILTERS: SearchFiltersType = {
  priceRange: [0, 2000000],
  bedrooms: null,
  bathrooms: null,
  propertyType: '',
  location: '',
  sortBy: 'price'
};

// View types
type ViewType = 'home' | 'personal' | 'alert-results';
type ViewMode = 'grid' | 'map';
type AuthTab = 'signin' | 'signup';
type SignupIntent = 'free' | 'premium' | null;

// Extended user interface for internal use
interface ExtendedUserProfile extends UserProfile {
  name?: string;
  phone?: string;
  isPremium?: boolean;
}

export default function App() {
  // Property-related state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [searchResults, setSearchResults] = useState<Property[] | null>(null);
  
  // Search and filter state
  const [searchFilters, setSearchFilters] = useState<SearchFiltersType>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
  // Navigation state
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedAlert, setSelectedAlert] = useState<PropertyAlert | null>(null);
  
  // AI state
  const [aiText, setAiText] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Authentication state
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
          // Extend user profile with missing properties
          const extendedUser: ExtendedUserProfile = {
            ...currentUser,
            name: currentUser.fullName || '',
            phone: '',
            isPremium: false // Default value, should come from backend
          };
          setUser(extendedUser);
        }
      } catch {
        authUtils.clearTokens();
      }

      // Load favorites from localStorage
      try {
        const savedFavorites = localStorage.getItem('hf_favorites');
        if (savedFavorites) {
          setFavorites(JSON.parse(savedFavorites));
        }
      } catch {
        setFavorites([]);
      }
    };

    initializeApp();
  }, []);

  // Persist favorites to localStorage
  useEffect(() => {
    localStorage.setItem('hf_favorites', JSON.stringify(favorites));
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
      searchFilters.priceRange[0] === 0 &&
      searchFilters.priceRange[1] === 2000000 &&
      searchFilters.bedrooms === null &&
      searchFilters.bathrooms === null &&
      searchFilters.propertyType === '' &&
      searchFilters.location === '' &&
      searchFilters.sortBy === 'price';
    
    return searchQuery.trim() === '' && isDefaultFilters;
  };

  const resetToDefaults = () => {
    setSearchQuery('');
    setSearchFilters(DEFAULT_FILTERS);
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
        toast.error('Favorite limit reached', {
          description: `Free plan allows up to ${maxFavorites} favorites. Upgrade for unlimited.`,
        });
        return;
      }
    }
    
    setFavorites(prev => 
      exists 
        ? prev.filter(p => p.id !== property.id) 
        : [...prev, property]
    );
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
    toast.success('Search started!', {
      description: `Searching: "${query}"`,
    });
  };

  const handleSubmitSearch = async (query: string) => {
    setAiLoading(true);
    setAiError(null);
    
    try {
      const { searchProperties } = await import('./api/properties.service');
      const result = await searchProperties({ searchQuery: query });
      
      setSearchResults(result.properties || []);
      setAiText(result.aiResponse || '');
      setSearchQuery(query);
      
      if (currentView !== 'home') setCurrentView('home');
      if (window.location.hash) window.location.hash = '';
      
      if (result.properties?.length === 0) {
        toast.info('No results found', { 
          description: 'AI will provide suggestions even without listings.' 
        });
      }
    } catch {
      setSearchResults([]);
      setAiText('');
      setAiError('Unable to get AI response right now.');
      setSearchQuery(query);
      
      if (currentView !== 'home') setCurrentView('home');
      if (window.location.hash) window.location.hash = '';
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
          name: currentUser.fullName || '',
          phone: '',
          isPremium: false
        };
        setUser(extendedUser);
        
        // Handle premium signup intent
        if (signupIntent === 'premium' && !extendedUser.isPremium) {
          setSignupIntent(null);
          setTimeout(() => setIsUpgradeModalOpen(true), 0);
        }

        toast.success(`Welcome, ${currentUser.fullName}!`, {
          description: 'Successfully authenticated.',
        });
      }
    } catch {
      toast.error('Failed to load user data');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setCurrentView('home');
      resetToDefaults();
      window.location.hash = '';
      
      toast.success('Successfully logged out!', {
        description: 'See you soon!',
      });
    } catch {
      authUtils.clearTokens();
      setUser(null);
      toast.error('Logout error, but disconnected locally.');
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
      toast.success('Upgrade successful!', {
        description: 'Welcome to Premium! All features unlocked.',
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
        title: `Modern Apartment in ${alert.location}`,
        price: alert.priceRange[0] + (alert.priceRange[1] - alert.priceRange[0]) * 0.3,
        bedrooms: alert.bedrooms || 2,
        bathrooms: alert.bathrooms || 2,
        area: 1200,
        location: alert.location,
        address: `123 Main Street, ${alert.location}`,
        images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop'],
        description: `Property found through your alert "${alert.name}". Perfectly matches your criteria!`,
        features: ['Matches Alert', 'Newly Listed', 'Panoramic View', 'Garage'],
        yearBuilt: 2020,
        propertyType: alert.propertyType as 'apartment' | 'house' | 'condo',
        listingAgent: {
          name: 'Ana Silva',
          phone: '(11) 99999-1111',
          email: 'ana@alertproperties.com'
        }
      },
      {
        id: 'alert-2',
        title: `Premium ${alert.propertyType === 'house' ? 'House' : 'Apartment'} ${alert.location}`,
        price: alert.priceRange[0] + (alert.priceRange[1] - alert.priceRange[0]) * 0.7,
        bedrooms: (alert.bedrooms || 2) + 1,
        bathrooms: (alert.bathrooms || 2),
        area: 1600,
        location: alert.location,
        address: `456 Central Ave, ${alert.location}`,
        images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop'],
        description: `Exclusive property that meets all criteria of your alert "${alert.name}". New to market!`,
        features: ['Perfect Match', 'Premium Finishes', 'Prime Location', 'Pool'],
        yearBuilt: 2021,
        propertyType: alert.propertyType as 'apartment' | 'house' | 'condo',
        listingAgent: {
          name: 'Carlos Santos',
          phone: '(11) 99999-2222',
          email: 'carlos@alertproperties.com'
        }
      }
    ];

    return mockProperties.slice(0, alert.newMatches || 2);
  };

  // Convert extended user to regular user for components that need it
  const convertToUser = (extendedUser: ExtendedUserProfile) => ({
    id: extendedUser.id,
    name: extendedUser.name || extendedUser.fullName || '',
    email: extendedUser.email,
    phone: extendedUser.phone || '',
    avatar: extendedUser.avatarUrl,
    isPremium: extendedUser.isPremium || false,
    createdAt: createSafeDate(extendedUser.createdAt)
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
          <Suspense fallback={null}>
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
            <Suspense fallback={null}>
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
