import React, { useState } from 'react';
import { Search, Map, Grid3X3, Home, User, ArrowUp, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { UserProfileDropdown } from './UserProfileDropdown';
import { AIResponseBox } from './AIResponseBox';

// Extended user interface for internal use
interface ExtendedUserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  name?: string;
  phone?: string;
}

interface ConversationMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface HeaderProps {
  searchQuery: string;
  viewMode: 'grid' | 'map';
  setViewMode: (mode: 'grid' | 'map') => void;
  user: ExtendedUserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigateToPersonal: () => void;
  onNavigateToHome: () => void;
  currentView: 'home' | 'personal' | 'alert-results';
  onSubmitSearch?: (query: string) => void;
  aiText?: string;
  aiLoading?: boolean;
  aiError?: string | null;
}

export function Header({
  searchQuery,
  viewMode,
  setViewMode,
  user,
  onOpenAuth,
  onLogout,
  onNavigateToPersonal,
  onNavigateToHome,
  currentView,
  onSubmitSearch,
  aiText,
  aiLoading,
  aiError
}: HeaderProps) {
  const [aiOpen, setAiOpen] = useState(false);
  const [localInput, setLocalInput] = useState(searchQuery);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentUserQuery, setCurrentUserQuery] = useState<string>('');

  const handleSubmitSearch = () => {
    if (!user) { 
      onOpenAuth(); 
      return; 
    }
    
    const query = localInput.trim();
    if (!query) return;
    
    setCurrentUserQuery(query);
    setAiOpen(true);
    onSubmitSearch?.(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (user && e.key === 'Enter') {
      handleSubmitSearch();
    }
  };

  const handleReopenAI = () => {
    setAiOpen(true);
  };

  const handleToggleAI = () => {
    setAiOpen(!aiOpen);
  };

  const renderViewTitle = () => {
    switch (currentView) {
      case 'personal':
        return (
          <div className="flex-1 flex items-center justify-center">
            <h1 className="text-xl font-semibold text-title">Área Pessoal</h1>
          </div>
        );
      case 'alert-results':
        return (
          <div className="flex-1 flex items-center justify-center">
            <h1 className="text-xl font-semibold text-title">Resultados do Alerta</h1>
          </div>
        );
      default:
        return null;
    }
  };

  const renderSearchBar = () => {
    if (currentView !== 'home') return null;

    return (
      <div className="flex-1 max-w-2xl mx-8 relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
              user ? 'text-clay-secondary' : 'text-clay-secondary/50'
            }`} />
            <Input
              placeholder={user ? "Conte-me que tipo de casa está à procura..." : "Crie a sua conta para começar a pesquisar..."}
              value={user ? localInput : ''}
              onChange={(e) => user && setLocalInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!user}
              className={`pl-12 pr-28 h-12 text-base border-clay-medium focus:border-primary rounded-xl bg-input-background shadow-sm ${
                !user ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
            {user && (
              <Button
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 bg-burnt-peach hover:bg-burnt-peach-deep text-white border-0 shadow-clay-soft"
                onClick={handleSubmitSearch}
                disabled={!localInput.trim()}
                aria-label="Abrir resposta IA"
                title="Perguntar IA"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Chat Icon Button */}
          {user && (
            <Button
              size="icon"
              variant="ghost"
              className="h-12 w-12 text-clay-secondary hover:text-title hover:bg-clay-soft border border-clay-medium rounded-xl relative"
              onClick={handleToggleAI}
              aria-label="Abrir chat IA"
              title="Chat IA"
            >
              <MessageCircle className="h-5 w-5" />
              {conversationHistory.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-burnt-peach text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium">
                  {conversationHistory.filter(msg => msg.type === 'ai').length}
                </div>
              )}
            </Button>
          )}
        </div>

        {user && (
          <AIResponseBox 
            open={aiOpen} 
            text={aiText} 
            loading={aiLoading} 
            error={aiError || null} 
            onClose={() => setAiOpen(false)}
            onReopen={handleReopenAI}
            userQuery={currentUserQuery}
            conversationHistory={conversationHistory}
            onUpdateHistory={setConversationHistory}
          />
        )}

        {!user && (
          <div
            className="absolute inset-0 bg-transparent cursor-pointer rounded-xl"
            onClick={onOpenAuth}
            title="Crie a sua conta para aceder à pesquisa"
          />
        )}
      </div>
    );
  };

  const renderViewModeToggle = () => {
    if (currentView !== 'home' || !user) return null;

    return (
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
    );
  };

  const renderUserSection = () => {
    if (user) {
      // Convert to expected format for UserProfileDropdown
      const userForDropdown = {
        id: user.id,
        name: user.name || user.fullName || '',
        email: user.email,
        phone: user.phone || '',
        avatar: user.avatarUrl,
      };

      return (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateToPersonal}
            className={`hidden md:flex hover:bg-clay-soft text-clay-secondary hover:text-title ${
              currentView === 'personal' || currentView === 'alert-results' ? 'bg-clay-soft text-title' : ''
            }`}
          >
            <User className="h-4 w-4 mr-2" />
            Minha Área
          </Button>
          <UserProfileDropdown 
            user={userForDropdown} 
            onLogout={onLogout} 
            onNavigateToPersonal={onNavigateToPersonal}
          />
        </div>
      );
    }

    return (
      <Button 
        onClick={onOpenAuth}
        className="bg-primary hover:bg-primary/90 text-white shadow-burnt-peach border-0"
      >
        Iniciar Sessão
      </Button>
    );
  };

  return (
    <header className="bg-card/95 backdrop-blur-lg border-b border-clay-medium sticky top-0 z-50 shadow-clay-soft">
      <div className="site-container relative">
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
                <div className="text-xs text-clay-secondary -mt-0.5">
                  Encontre seu lar ideal
                </div>
              </div>
            </Button>
          </div>

          {/* Dynamic Content Area */}
          {renderSearchBar()}
          {renderViewTitle()}

          {/* Right Side Controls */}
          <div className="flex items-center space-x-3">

            {/* View Mode Toggle */}
            {renderViewModeToggle()}

            {/* User Section */}
            {renderUserSection()}
          </div>
        </div>
      </div>
    </header>
  );
}
