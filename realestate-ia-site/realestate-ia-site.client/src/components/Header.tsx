import { Home } from 'lucide-react';
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
        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-blue border-0 text-xs sm:text-sm px-3 sm:px-4 h-9 sm:h-10"
      >
        Iniciar Sessão
      </Button>
    );
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-strong backdrop-blur-sm">
      <div className="site-container">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo Section */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={handleNavigateToHome}
          >
            <div className="relative">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-blue group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                <Home className="h-5 w-5 lg:h-6 lg:w-6 text-primary-foreground" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-background"></div>
            </div>
            <div>
              <h1 className="text-lg lg:text-xl font-bold text-foreground tracking-tight">
                ResideAI
              </h1>
              <p className="text-xs text-muted-foreground -mt-0.5">
                Pesquisa Inteligente
              </p>
            </div>
          </div>

          {/* Center Title (only for personal area) */}
          {currentView === 'personal' && (
            <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
              <h2 className="text-lg font-medium text-foreground">Área Pessoal</h2>
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {renderUserSection()}
          </div>
        </div>
      </div>
    </header>
  );
}