import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from './ui/dropdown-menu';
import { 
  User, 
  LogOut, 
  Crown, 
  ChevronDown, 
  Shield,
  UserCircle,
  Mail
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  isPremium?: boolean;
}

interface UserProfileDropdownProps {
  user: User;
  onLogout: () => void;
  onNavigateToPersonal?: () => void;
  onOpenUpgradeModal?: () => void;
}

export function UserProfileDropdown({ user, onLogout, onNavigateToPersonal, onOpenUpgradeModal }: UserProfileDropdownProps) {
  const handleNavigation = (section?: string) => {
    if (onNavigateToPersonal) {
      onNavigateToPersonal();
      // If specific section, navigate to it (future enhancement)
      if (section) {
        setTimeout(() => {
          window.location.hash = `#personal-${section}`;
        }, 100);
      }
    }
  };

  const handleExternalLink = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-2 hover:bg-pale-clay-light">
          <Avatar className="h-8 w-8 border-2 border-pale-clay-deep">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-pale-clay text-deep-mocha text-sm">
              {user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex items-center space-x-1">
            <span className="text-deep-mocha">{user.name.split(' ')[0]}</span>
            <ChevronDown className="h-3 w-3 text-warm-taupe" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 bg-pure-white border border-pale-clay-deep shadow-clay-deep">
        {/* User Info Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-pale-clay-light to-porcelain-soft">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12 border-2 border-burnt-peach-light">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-burnt-peach-lighter text-deep-mocha font-medium">
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium text-deep-mocha">{user.name}</p>
              <p className="text-xs text-warm-taupe">{user.email}</p>
              <div className="flex items-center mt-1.5">
                {user.isPremium ? (
                  <Badge className="bg-burnt-peach text-pure-white border-0 text-xs px-2 py-0.5">
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                ) : (
                  <Badge className="bg-pale-clay-deep text-warm-taupe border-0 text-xs px-2 py-0.5">
                    <Shield className="h-3 w-3 mr-1" />
                    Gratuito
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-pale-clay-medium" />

        {/* Quick Access - Personal Area */}
        <DropdownMenuLabel className="px-4 py-2 text-xs font-medium text-warm-taupe-dark bg-pale-clay-light/50">
          Área Pessoal
        </DropdownMenuLabel>
        
        <DropdownMenuItem 
          onClick={() => handleNavigation()}
          className="px-4 py-2.5 hover:bg-pale-clay-light text-deep-mocha hover:text-deep-mocha cursor-pointer group"
        >
          <UserCircle className="h-4 w-4 mr-3 text-burnt-peach group-hover:text-burnt-peach-deep" />
          <span>Meu Perfil</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-pale-clay-medium" />

        {/* Support & Resources */}
        <DropdownMenuLabel className="px-4 py-2 text-xs font-medium text-warm-taupe-dark bg-pale-clay-light/50">
          Suporte & Recursos
        </DropdownMenuLabel>

        <DropdownMenuItem 
          onClick={() => handleExternalLink('mailto:suporte@homefinder.ai')}
          className="px-4 py-2.5 hover:bg-pale-clay-light text-deep-mocha hover:text-deep-mocha cursor-pointer group"
        >
          <Mail className="h-4 w-4 mr-3 text-info-gentle group-hover:text-info-strong" />
          <span>Contacto por Email</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-pale-clay-medium" />

        {/* Logout */}
        <DropdownMenuItem 
          onClick={onLogout}
          className="px-4 py-3 hover:bg-error-soft text-error-strong hover:text-error-strong cursor-pointer group"
        >
          <LogOut className="h-4 w-4 mr-3" />
          <span className="font-medium">Terminar Sessão</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}