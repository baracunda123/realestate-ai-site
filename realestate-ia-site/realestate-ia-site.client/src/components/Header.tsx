import React from 'react';
import { Search, Map, Grid3X3, Home, Crown, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { UserProfileDropdown } from './UserProfileDropdown';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  isPremium?: boolean;
}

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  viewMode: 'grid' | 'map';
  setViewMode: (mode: 'grid' | 'map') => void;
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigateToPersonal: () => void;
  onNavigateToHome: () => void;
  currentView: 'home' | 'personal';
  onOpenUpgradeModal?: () => void;
}

export function Header({ 
  searchQuery, 
  setSearchQuery, 
  viewMode, 
  setViewMode, 
  user, 
  onOpenAuth, 
  onLogout,
  onNavigateToPersonal,
  onNavigateToHome,
  currentView,
  onOpenUpgradeModal
}: HeaderProps) {
  return (
    <header className="bg-card/95 backdrop-blur-lg border-b border-clay-medium sticky top-0 z-50 shadow-clay-soft">
      <div className="container mx-auto px-4 relative">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              className="flex items-center space-x-3 p-2 hover:bg-clay-soft"
              onClick={onNavigateToHome}
            >
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-burnt-peach">
                <Home className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-semibold text-title">
                  HomeFinder AI
                </span>
                <div className="text-xs text-clay-secondary -mt-0.5">Encontre seu lar ideal</div>
              </div>
            </Button>
          </div>

          {/* Search Bar - Only show on home view */}
          {currentView === 'home' && (
            <div className="flex-1 max-w-2xl mx-8 relative">
              <div className="relative">
                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                  user ? 'text-clay-secondary' : 'text-clay-secondary/50'
                }`} />
                <Input
                  placeholder={user ? "Conte-me que tipo de casa está à procura..." : "Crie a sua conta para começar a pesquisar..."}
                  value={user ? searchQuery : ''}
                  onChange={(e) => user && setSearchQuery(e.target.value)}
                  disabled={!user}
                  className={`pl-12 pr-4 h-12 text-base border-clay-medium focus:border-primary rounded-xl bg-input-background shadow-sm ${
                    !user ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                />
              </div>
              
              {/* Overlay for non-logged users */}
              {!user && (
                <div 
                  className="absolute inset-0 bg-transparent cursor-pointer rounded-xl"
                  onClick={onOpenAuth}
                  title="Crie a sua conta para aceder à pesquisa"
                />
              )}
            </div>
          )}

          {/* Personal Area Title */}
          {currentView === 'personal' && (
            <div className="flex-1 flex items-center justify-center">
              <h1 className="text-xl font-semibold text-title">Área Pessoal</h1>
            </div>
          )}

          {/* Right Side Controls */}
          <div className="flex items-center space-x-3">
            {/* Premium Badge for Free Users */}
            {user && !user.isPremium && (
              <Button 
                size="sm" 
                className="hidden md:flex bg-secondary hover:bg-secondary/90 text-white shadow-cocoa-taupe border-0"
                onClick={onOpenUpgradeModal}
              >
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Button>
            )}

            {/* View Toggle - Only show on home view and if user is logged in */}
            {currentView === 'home' && user && (
              <div className="hidden md:flex items-center bg-muted rounded-lg p-1 border border-clay-medium">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className={`h-8 w-8 p-0 ${
                    viewMode === 'grid' 
                      ? 'bg-card border border-clay-medium shadow-clay-soft' 
                      : 'hover:bg-clay-soft'
                  }`}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'map' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('map')}
                  className={`h-8 w-8 p-0 ${
                    viewMode === 'map' 
                      ? 'bg-card border border-clay-medium shadow-clay-soft' 
                      : 'hover:bg-clay-soft'
                  }`}
                >
                  <Map className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* User Section */}
            {user ? (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onNavigateToPersonal}
                  className={`hidden md:flex hover:bg-clay-soft text-clay-secondary hover:text-title ${
                    currentView === 'personal' ? 'bg-clay-soft text-title' : ''
                  }`}
                >
                  <User className="h-4 w-4 mr-2" />
                  Minha Área
                </Button>
                <UserProfileDropdown 
                  user={user} 
                  onLogout={onLogout} 
                  onNavigateToPersonal={onNavigateToPersonal}
                  onOpenUpgradeModal={onOpenUpgradeModal}
                />
              </div>
            ) : (
              <Button 
                onClick={onOpenAuth}
                className="bg-primary hover:bg-primary/90 text-white shadow-burnt-peach border-0"
              >
                Iniciar Sessão
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}