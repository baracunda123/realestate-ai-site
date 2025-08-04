//import React from 'react';
import { Search, Map, Grid3X3, Sparkles, Menu, Home, UserPlus, LogIn } from 'lucide-react';
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
}

export function Header({ 
  searchQuery, 
  setSearchQuery, 
  viewMode, 
  setViewMode, 
  user, 
  onOpenAuth, 
  onLogout 
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
      <div 
        className="absolute inset-0 gradient-primary opacity-5"
        style={{
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(124, 58, 237, 0.05) 100%)'
        }}
      />
      <div className="container mx-auto px-4 relative">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-semibold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                HomeFinder AI
              </span>
              <div className="text-xs text-muted-foreground -mt-0.5">Encontre seu lar ideal</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Conte-me que tipo de casa você está procurando..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-16 h-12 text-base border-2 border-primary/20 focus:border-primary/50 rounded-xl bg-white/80 backdrop-blur-sm"
              />
              <Button
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 gradient-primary text-white border-0 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Busca AI
              </Button>
            </div>
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="hidden sm:flex bg-secondary rounded-xl p-1 border border-primary/20">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`h-8 rounded-lg transition-all duration-200 ${
                  viewMode === 'grid' 
                    ? 'gradient-primary text-white shadow-md' 
                    : 'text-primary hover:bg-primary/10'
                }`}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('map')}
                className={`h-8 rounded-lg transition-all duration-200 ${
                  viewMode === 'map' 
                    ? 'gradient-primary text-white shadow-md' 
                    : 'text-primary hover:bg-primary/10'
                }`}
              >
                <Map className="h-4 w-4" />
              </Button>
            </div>

            {/* Authentication */}
            {user ? (
              <UserProfileDropdown user={user} onLogout={onLogout} />
            ) : (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onOpenAuth}
                  className="text-primary hover:bg-primary/10 hidden sm:flex"
                >
                  <LogIn className="h-4 w-4 mr-1" />
                  Entrar
                </Button>
                <Button
                  size="sm"
                  onClick={onOpenAuth}
                  className="bg-gradient-to-r from-primary to-purple-600 text-white border-0 hover:shadow-md transition-all duration-200"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Cadastrar</span>
                </Button>
              </div>
            )}
            
            <Button variant="ghost" size="sm" className="sm:hidden hover:bg-primary/10">
              <Menu className="h-4 w-4 text-primary" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}