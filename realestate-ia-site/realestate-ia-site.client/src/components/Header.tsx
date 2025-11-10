import { Home, User } from 'lucide-react';
import { Button } from './ui/button';
import { UserProfileDropdown } from './UserProfileDropdown';

// Extended user interface for internal use
interface ExtendedUserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  name?: string;
  phone?: string;
}

interface HeaderProps {
  user: ExtendedUserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNavigateToPersonal: () => void;
  onNavigateToHome: () => void;
  currentView: 'home' | 'personal' | 'alert-results';
}

export function Header({
  user,
  onOpenAuth,
  onLogout,
  onNavigateToPersonal,
  onNavigateToHome,
  currentView
}: HeaderProps) {

  const handleNavigateToHome = () => {
    onNavigateToHome();
  };

  const handleNavigateToPersonal = () => {
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
      case 'home':
        return (
          <div className="flex-1 flex items-center justify-center">
            {/* Título removido - botão de pesquisa movido para WelcomeScreen */}
          </div>
        );
      default:
        return null;
    }
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
        <div className="flex items-center space-x-1 sm:space-x-2">
          {currentView === 'home' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNavigateToPersonal}
              className="hidden md:flex hover:bg-clay-soft text-clay-secondary hover:text-title bg-clay-soft text-title px-3 py-2"
            >
              <User className="h-4 w-4 mr-2" />
              A minha área
            </Button>
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
        className="bg-primary hover:bg-primary/90 text-white shadow-burnt-peach border-0 text-xs sm:text-sm px-3 sm:px-4 h-9 sm:h-10"
      >
        Iniciar Sessão
      </Button>
    );
  };

  return (
    <header className="bg-card/95 backdrop-blur-lg border-b border-clay-medium sticky top-0 z-50 shadow-clay-soft">
      <div className="site-container relative">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-1 sm:gap-2">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <div
              className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 p-1 sm:p-1.5 md:p-2 cursor-pointer"
              onClick={handleNavigateToHome}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-primary rounded-lg md:rounded-xl flex items-center justify-center shadow-burnt-peach">
                <Home className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-base sm:text-lg md:text-xl font-semibold text-title">
                  ResideAI
                </span>
                <div className="text-xs text-clay-secondary -mt-0.5 hidden md:block">
                  Encontra o teu lar ideal
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Content Area */}
          {renderViewTitle()}

          {/* Right Side Controls */}
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 flex-shrink-0">
            {/* User Section */}
            {renderUserSection()}
          </div>
        </div>
      </div>
    </header>
  );
}
