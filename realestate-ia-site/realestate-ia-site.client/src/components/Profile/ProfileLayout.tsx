import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { 
  User, 
  Heart, 
  Clock, 
  Settings,
  ArrowLeft
} from 'lucide-react';

interface ProfileLayoutProps {
  children: ReactNode;
  hasActiveSearch?: boolean;
  onNavigateToHome?: (reset?: boolean) => void;
}

export function ProfileLayout({ children, hasActiveSearch, onNavigateToHome }: ProfileLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/profile', label: 'Perfil', icon: User },
    { path: '/favorites', label: 'Favoritos', icon: Heart },
    { path: '/history', label: 'Histórico', icon: Clock },
    { path: '/settings', label: 'Configurações', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6">
      {/* Botão Voltar aos Resultados - apenas se houver pesquisa ativa */}
      {hasActiveSearch && onNavigateToHome && (
        <div className="mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateToHome(false)}
            className="flex items-center space-x-2 text-sm px-4 py-2 font-medium shadow-clay-soft focus:outline-none focus:ring-2 focus:ring-burnt-peach/20"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar aos Resultados</span>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <aside className="lg:col-span-1">
          <nav className="space-y-1 sticky top-20">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`
                    w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all
                    ${active 
                      ? 'bg-burnt-peach text-white shadow-burnt-peach' 
                      : 'text-clay-secondary hover:bg-clay-soft hover:text-title'
                    }
                  `}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-white' : 'text-burnt-peach'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="lg:col-span-3">
          {children}
        </main>
      </div>
    </div>
  );
}
