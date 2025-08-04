import { useState } from 'react';
import { Header } from './components/Header';
import { SearchFilters } from './components/SearchFilters';
import { PropertyGrid } from './components/PropertyGrid';
import { PropertyModal } from './components/PropertyModal';
import { AISuggestions } from './components/AISuggestions';
import { MapView } from './components/MapView';
import { AuthModal } from './components/AuthModal';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';

export interface Property {
  id: string;
  title: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  location: string;
  address: string;
  images: string[];
  description: string;
  features: string[];
  yearBuilt: number;
  propertyType: 'house' | 'apartment' | 'condo' | 'townhouse';
  listingAgent: {
    name: string;
    phone: string;
    email: string;
  };
  aiRelevanceScore?: number;
}

export interface SearchFilters {
  priceRange: [number, number];
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string;
  location: string;
  sortBy: 'price' | 'date' | 'size';
}

interface User {
  id: string;
  name: string;
    email: string;
    passwd: string; // Note: In real apps, passwords should not be stored like this
  phone: string;
  avatar?: string;
  isPremium?: boolean;
  createdAt: Date;
}

export default function App() {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    priceRange: [0, 2000000],
    bedrooms: null,
    bathrooms: null,
    propertyType: '',
    location: '',
    sortBy: 'price'
  });
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Function to update filters (can be used by AI)
  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    setSearchFilters(prevFilters => ({
      ...prevFilters,
      ...newFilters
    }));
  };

  // Authentication handlers
  const handleSignIn = (email: string, password: string) => {
    // Mock authentication - in real app, this would call an API
    const mockUser: User = {
      id: '1',
      name: 'João Silva',
        email: email,
        passwd: password, // Not stored in real apps    
      phone: '(11) 99999-9999',
      isPremium: Math.random() > 0.5, // Random premium status for demo
      createdAt: new Date()
    };
    
    setUser(mockUser);
    setIsAuthModalOpen(false);
    toast.success(`Bem-vindo de volta, ${mockUser.name}!`, {
      description: 'Você está logado com sucesso.',
    });
  };

  const handleSignUp = (name: string, email: string, phone: string, password: string) => {
    // Mock registration - in real app, this would call an API
    const mockUser: User = {
      id: Date.now().toString(),
      name: name,
        email: email,
        passwd: password, // Not stored in real apps
      phone: phone,
      isPremium: false, // New users start as free
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
    toast.success('Logout realizado com sucesso!', {
      description: 'Até logo! Esperamos vê-lo em breve.',
    });
  };

  const openAuthModal = () => {
    setIsAuthModalOpen(true);
  };

  return (
    <div 
      className="min-h-screen"
      style={{
        background: `
          linear-gradient(135deg, #fafbff 0%, #f0f9ff 50%, #faf5ff 100%),
          radial-gradient(circle at 20% 20%, rgba(79, 70, 229, 0.03) 0%, transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.03) 0%, transparent 50%),
          radial-gradient(circle at 40% 60%, rgba(139, 92, 246, 0.02) 0%, transparent 50%)
        `
      }}
    >
      <Header 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        viewMode={viewMode}
        setViewMode={setViewMode}
        user={user}
        onOpenAuth={openAuthModal}
        onLogout={handleLogout}
      />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <SearchFilters 
              filters={searchFilters}
              setFilters={setSearchFilters}
            />
            <AISuggestions searchQuery={searchQuery} user={user} />
          </div>
          
          {/* Main Content */}
          <div className="lg:col-span-3">
            {viewMode === 'grid' ? (
              <PropertyGrid 
                filters={searchFilters}
                searchQuery={searchQuery}
                onPropertySelect={setSelectedProperty}
                onFiltersUpdate={updateFilters}
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
      </main>

      {/* Modals */}
      {selectedProperty && (
        <PropertyModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
        />
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
      />

      {/* Toast Notifications */}
      <Toaster richColors position="top-right" />
    </div>
  );
}