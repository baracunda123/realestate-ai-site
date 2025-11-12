import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from './ui/dropdown-menu';
import { 
  User, 
  LogOut, 
  ChevronDown, 
  UserCircle,
  Mail,
  CreditCard,
  Heart,
  Clock,
  Settings
} from 'lucide-react';
import { getUniversalInitials } from '../utils/PersonalArea';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
}

interface UserProfileDropdownProps {
  user: User;
  onLogout: () => void;
  onNavigateToPersonal?: () => void; // Deprecated - kept for compatibility
}

export function UserProfileDropdown({ user, onLogout }: UserProfileDropdownProps) {
  const navigate = useNavigate();

  const handleExternalLink = (url: string) => {
    window.open(url, '_blank');
  };

  // Use the universal initials function for consistency
  const userInitials = getUniversalInitials({
    name: user.name,
    fullName: user.name, // In this context, name is the fullName
    email: user.email
  });

  const displayName = user.name || user.email.split('@')[0];
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="group flex items-center space-x-2 p-1 sm:p-1.5 h-auto hover:bg-pale-clay-light rounded-full transition-all duration-200 hover:shadow-clay-soft"
        >
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-pale-clay-deep group-hover:border-burnt-peach transition-all duration-200 group-hover:shadow-burnt-peach">
            <AvatarImage src={user.avatar} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-br from-pale-clay to-pale-clay-medium text-deep-mocha text-sm font-medium group-hover:from-burnt-peach-lighter group-hover:to-burnt-peach-light transition-all duration-200">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex items-center space-x-1 pr-1">
            <span className="text-deep-mocha text-sm font-medium group-hover:text-burnt-peach transition-colors duration-200">{displayName}</span>
            <ChevronDown className={`h-3 w-3 text-warm-taupe group-hover:text-burnt-peach transition-all duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-72 bg-pure-white border border-pale-clay-deep shadow-clay-strong rounded-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* User Info Header */}
        <div className="px-4 py-4 bg-gradient-to-br from-burnt-peach-lighter/30 via-pale-clay-light/50 to-porcelain-soft relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
          <div className="flex items-center space-x-3 relative z-10">
            <Avatar className="h-14 w-14 border-2 border-burnt-peach shadow-burnt-peach ring-2 ring-burnt-peach/20 transition-all duration-200 hover:scale-105">
              <AvatarImage src={user.avatar} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-burnt-peach-lighter to-burnt-peach text-white font-semibold text-base">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-deep-mocha truncate">{displayName}</p>
              <p className="text-xs text-warm-taupe-dark truncate">{user.email}</p>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-gradient-to-r from-transparent via-pale-clay-medium to-transparent" />

        {/* Quick Access - Personal Area */}
        <DropdownMenuLabel className="px-4 py-2.5 text-xs font-semibold text-warm-taupe-dark uppercase tracking-wider bg-gradient-to-r from-pale-clay-light/30 to-transparent">
          Área Pessoal
        </DropdownMenuLabel>
        
        <DropdownMenuItem 
          onClick={() => navigate('/profile')}
          className="mx-2 my-0.5 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-burnt-peach-lighter/20 hover:to-burnt-peach-light/10 text-deep-mocha hover:text-burnt-peach-dark cursor-pointer group transition-all duration-200 hover:shadow-clay-soft"
        >
          <UserCircle className="h-4 w-4 mr-3 text-burnt-peach group-hover:text-burnt-peach-deep transition-all duration-200 group-hover:scale-110" />
          <span className="font-medium">Meu Perfil</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/favorites')}
          className="mx-2 my-0.5 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-burnt-peach-lighter/20 hover:to-burnt-peach-light/10 text-deep-mocha hover:text-burnt-peach-dark cursor-pointer group transition-all duration-200 hover:shadow-clay-soft"
        >
          <Heart className="h-4 w-4 mr-3 text-burnt-peach group-hover:text-burnt-peach-deep transition-all duration-200 group-hover:scale-110 group-hover:fill-burnt-peach-deep" />
          <span className="font-medium">Favoritos</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/history')}
          className="mx-2 my-0.5 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-burnt-peach-lighter/20 hover:to-burnt-peach-light/10 text-deep-mocha hover:text-burnt-peach-dark cursor-pointer group transition-all duration-200 hover:shadow-clay-soft"
        >
          <Clock className="h-4 w-4 mr-3 text-burnt-peach group-hover:text-burnt-peach-deep transition-all duration-200 group-hover:scale-110" />
          <span className="font-medium">Histórico</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/settings')}
          className="mx-2 my-0.5 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-burnt-peach-lighter/20 hover:to-burnt-peach-light/10 text-deep-mocha hover:text-burnt-peach-dark cursor-pointer group transition-all duration-200 hover:shadow-clay-soft"
        >
          <Settings className="h-4 w-4 mr-3 text-burnt-peach group-hover:text-burnt-peach-deep transition-all duration-200 group-hover:scale-110 group-hover:rotate-90" />
          <span className="font-medium">Configurações</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 bg-gradient-to-r from-transparent via-pale-clay-medium to-transparent" />

        {/* Pricing */}
        <DropdownMenuItem 
          onClick={() => navigate('/pricing')}
          className="mx-2 my-0.5 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-cocoa-taupe-lighter/20 hover:to-cocoa-taupe-light/10 text-deep-mocha hover:text-cocoa-taupe-dark cursor-pointer group transition-all duration-200 hover:shadow-clay-soft"
        >
          <CreditCard className="h-4 w-4 mr-3 text-cocoa-taupe group-hover:text-cocoa-taupe-dark transition-all duration-200 group-hover:scale-110" />
          <span className="font-medium">Ver Planos</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 bg-gradient-to-r from-transparent via-pale-clay-medium to-transparent" />

        {/* Support & Resources */}
        <DropdownMenuLabel className="px-4 py-2.5 text-xs font-semibold text-warm-taupe-dark uppercase tracking-wider bg-gradient-to-r from-pale-clay-light/30 to-transparent">
          Suporte & Recursos
        </DropdownMenuLabel>

        <DropdownMenuItem 
          onClick={() => handleExternalLink('mailto:suporte@homefinder.ai')}
          className="mx-2 my-0.5 px-3 py-2.5 rounded-lg hover:bg-gradient-to-r hover:from-info-soft hover:to-info-gentle/10 text-deep-mocha hover:text-info-strong cursor-pointer group transition-all duration-200 hover:shadow-clay-soft"
        >
          <Mail className="h-4 w-4 mr-3 text-info-gentle group-hover:text-info-strong transition-all duration-200 group-hover:scale-110" />
          <span className="font-medium">Contacto por Email</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 bg-gradient-to-r from-transparent via-pale-clay-medium to-transparent" />

        {/* Logout */}
        <DropdownMenuItem 
          onClick={onLogout}
          className="mx-2 mb-2 mt-0.5 px-3 py-3 rounded-lg hover:bg-gradient-to-r hover:from-error-soft hover:to-error-gentle/10 text-error-strong hover:text-error-strong cursor-pointer group transition-all duration-200 hover:shadow-clay-soft border border-transparent hover:border-error-gentle/30"
        >
          <LogOut className="h-4 w-4 mr-3 transition-all duration-200 group-hover:scale-110 group-hover:-translate-x-0.5" />
          <span className="font-semibold">Terminar Sessão</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}