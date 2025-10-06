import React, { useState, useEffect, useRef } from 'react';
import { Search, Home, User, MessageCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { UserProfileDropdown } from './UserProfileDropdown';
import { AIResponseBox } from './AIResponseBox';
import { NotificationBell } from './NotificationBell/NotificationBell';
import { useUnreadNotificationsCount } from '../hooks/useNotifications';

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
  const lastProcessedQueryRef = useRef<string>('');
  const lastProcessedAITextRef = useRef<string>('');

  // SIGNALR: Hook SEMPRE executado - agora usa SignalR em vez de polling
  const { unreadCount, isLoading: notificationsLoading } = useUnreadNotificationsCount();

  // Reset local input when view changes and not on home page
  useEffect(() => {
    if (currentView !== 'home') {
      setLocalInput('');
    } else {
      setLocalInput('');
    }
  }, [currentView]);

  // Add user query to history when searchQuery changes (new search submitted)
  useEffect(() => {
    if (searchQuery && searchQuery !== lastProcessedQueryRef.current) {
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: searchQuery,
        timestamp: new Date()
      };
      
      setConversationHistory(prev => [...prev, userMessage]);
      lastProcessedQueryRef.current = searchQuery;
      setAiOpen(true);
    }
  }, [searchQuery]);

  // Add AI response to history when aiText changes (new response received)
  useEffect(() => {
    if (aiText && !aiLoading && !aiError && aiText !== lastProcessedAITextRef.current) {
      const aiMessage: ConversationMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: aiText,
        timestamp: new Date()
      };
      
      setConversationHistory(prev => [...prev, aiMessage]);
      lastProcessedAITextRef.current = aiText;
    }
  }, [aiText, aiLoading, aiError]);

  const handleSubmitSearch = () => {
    if (!user) { 
      onOpenAuth(); 
      return; 
    }
    
    const query = localInput.trim();
    if (!query) return;
    
    setAiOpen(true);
    onSubmitSearch?.(query);
    setLocalInput('');
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

  const handleNavigateToHome = () => {
    // Reset AI state when explicitly navigating home via logo
    setAiOpen(false);
    setConversationHistory([]);
    lastProcessedQueryRef.current = '';
    lastProcessedAITextRef.current = '';
    setLocalInput('');
    onNavigateToHome();
  };

  const handleNavigateToPersonal = () => {
    // Don't reset AI state when navigating to personal area
    // But close the AI box
    setAiOpen(false);
    onNavigateToPersonal();
  };

  // Handler para navegar para área pessoal na aba de alertas
  const handleNavigateToAlerts = () => {
    onNavigateToPersonal();
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
              className={`pl-12 pr-4 h-12 text-base border-clay-medium focus:border-primary rounded-xl bg-input-background shadow-sm ${
                !user ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
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
            conversationHistory={conversationHistory}
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

  const renderUserSection = () => {
    if (user) {
      const userForDropdown = {
        id: user.id,
        name: user.name || user.fullName || '',
        email: user.email,
        phone: user.phone || '',
        avatar: user.avatarUrl,
      };

      return (
          <div className="flex items-center space-x-2">
              {currentView === 'home' && (< Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNavigateToPersonal}
                  className={"shidden md:flex hover:bg-clay-soft text-clay-secondary hover:text-title bg-clay-soft text-title" }
                  >
                  <User className="h-4 w-4 mr-2" />
                  Minha Área
              </Button>
              )}
          
          {user && (
            <NotificationBell 
              onClick={handleNavigateToAlerts}
              className="hover:bg-clay-soft text-clay-secondary hover:text-title"
              unreadCount={unreadCount}
              isLoading={notificationsLoading}
            />
          )}
          
          <UserProfileDropdown 
            user={userForDropdown} 
            onLogout={onLogout} 
            onNavigateToPersonal={handleNavigateToPersonal}
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
              onClick={handleNavigateToHome}
            >
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-burnt-peach">
                <Home className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-xl font-semibold text-title">
                  ResideAI
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
            {/* User Section */}
            {renderUserSection()}
          </div>
        </div>
      </div>
    </header>
  );
}
