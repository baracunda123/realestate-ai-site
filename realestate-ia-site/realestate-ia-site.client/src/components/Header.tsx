import React from 'react';
import { Search, Map, Grid3X3, Home, UserPlus, LogIn, Sparkles } from 'lucide-react';
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
    <header className="bg-white/95 backdrop-blur-lg border-b border-gray-300 sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 relative">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl flex items-center justify-center shadow-md">
              <Home className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-semibold text-slate-800">
                HomeFinder AI
              </span>
              <div className="text-xs text-slate-600 -mt-0.5">Encontre seu lar ideal</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                placeholder="Conte-me que tipo de casa você está procurando..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-20 h-12 text-base border-slate-300 focus:border-slate-500 rounded-xl bg-white shadow-sm"
              />
              <Button
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 bg-slate-800 hover:bg-slate-900 text-white border-0 rounded-lg shadow-sm"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Busca AI
              </Button>
            </div>
          </div>

          {/* Right Side Controls */}
          <div className="flex items-center space-x-3">
            {/* View Toggle */}
            <div className="hidden sm:flex bg-slate-200 rounded-xl p-1 border border-slate-300">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`h-8 rounded-lg transition-all duration-200 ${
                  viewMode === 'grid' 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100'
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
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100'
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
                  className="text-slate-700 hover:bg-slate-100 hidden sm:flex"
                >
                  <LogIn className="h-4 w-4 mr-1" />
                  Entrar
                </Button>
                <Button
                  size="sm"
                  onClick={onOpenAuth}
                  className="bg-slate-800 hover:bg-slate-900 text-white border-0 shadow-sm"
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Cadastrar</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}