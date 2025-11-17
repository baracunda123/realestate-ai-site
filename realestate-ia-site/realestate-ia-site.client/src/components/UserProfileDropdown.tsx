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
        className="w-[calc(100vw-2rem)] max-w-80 sm:w-80 max-h-[calc(100vh-5rem)] overflow-y-auto bg-pure-white border-2 border-pale-clay-deep shadow-clay-strong rounded-2xl animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* User Info Header */}
        <div className="px-5 py-5 bg-gradient-to-br from-burnt-peach-lighter/20 via-pale-clay-light/40 to-porcelain relative overflow-hidden border-b-2 border-pale-clay-medium">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
          <div className="flex items-center space-x-4 relative z-10">
            <Avatar className="h-16 w-16 border-2 border-burnt-peach shadow-burnt-peach ring-4 ring-burnt-peach/10 transition-all duration-200 hover:scale-105 hover:ring-burnt-peach/20">
              <AvatarImage src={user.avatar} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-burnt-peach to-burnt-peach-dark text-white font-semibold text-lg">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-deep-mocha truncate text-base">{displayName}</p>
              <p className="text-sm text-warm-taupe truncate mt-0.5">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Quick Access - Personal Area */}
        <DropdownMenuLabel className="px-5 py-3 text-xs font-bold text-warm-taupe-dark uppercase tracking-wider bg-pale-clay-light/40 border-b border-pale-clay-medium">
          Área Pessoal
        </DropdownMenuLabel>
        
        <DropdownMenuItem 
          onClick={() => navigate('/profile')}
          className="mx-3 my-1 px-4 py-3 rounded-xl hover:bg-burnt-peach text-deep-mocha hover:text-white cursor-pointer group transition-all duration-75 hover:shadow-clay-soft border border-transparent hover:border-burnt-peach-dark"
        >
          <UserCircle className="h-5 w-5 mr-3 text-burnt-peach group-hover:text-white transition-all duration-75 group-hover:scale-110" />
          <span className="font-medium text-sm">Meu Perfil</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/favorites')}
          className="mx-3 my-1 px-4 py-3 rounded-xl hover:bg-burnt-peach text-deep-mocha hover:text-white cursor-pointer group transition-all duration-75 hover:shadow-clay-soft border border-transparent hover:border-burnt-peach-dark"
        >
          <Heart className="h-5 w-5 mr-3 text-burnt-peach group-hover:text-white transition-all duration-75 group-hover:scale-110 group-hover:fill-white" />
          <span className="font-medium text-sm">Favoritos</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/history')}
          className="mx-3 my-1 px-4 py-3 rounded-xl hover:bg-burnt-peach text-deep-mocha hover:text-white cursor-pointer group transition-all duration-75 hover:shadow-clay-soft border border-transparent hover:border-burnt-peach-dark"
        >
          <Clock className="h-5 w-5 mr-3 text-burnt-peach group-hover:text-white transition-all duration-75 group-hover:scale-110" />
          <span className="font-medium text-sm">Histórico</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/settings')}
          className="mx-3 my-1 px-4 py-3 rounded-xl hover:bg-burnt-peach text-deep-mocha hover:text-white cursor-pointer group transition-all duration-75 hover:shadow-clay-soft border border-transparent hover:border-burnt-peach-dark"
        >
          <Settings className="h-5 w-5 mr-3 text-burnt-peach group-hover:text-white transition-all duration-75 group-hover:scale-110 group-hover:rotate-90" />
          <span className="font-medium text-sm">Configurações</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 mx-3 bg-pale-clay-medium" />

        {/* Pricing */}
        <DropdownMenuItem 
          onClick={() => navigate('/pricing')}
          className="mx-3 my-1 px-4 py-3 rounded-xl hover:bg-cocoa-taupe text-deep-mocha hover:text-white cursor-pointer group transition-all duration-75 hover:shadow-clay-soft border border-transparent hover:border-cocoa-taupe-dark"
        >
          <CreditCard className="h-5 w-5 mr-3 text-cocoa-taupe group-hover:text-white transition-all duration-75 group-hover:scale-110" />
          <span className="font-medium text-sm">Ver Planos</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 mx-3 bg-pale-clay-medium" />

        {/* Support & Resources */}
        <DropdownMenuLabel className="px-5 py-3 text-xs font-bold text-warm-taupe-dark uppercase tracking-wider bg-pale-clay-light/40 border-b border-pale-clay-medium">
          Suporte & Recursos
        </DropdownMenuLabel>

        <DropdownMenuItem 
          onClick={() => handleExternalLink('mailto:suporte@homefinder.ai')}
          className="mx-3 my-1 px-4 py-3 rounded-xl hover:bg-cocoa-taupe text-deep-mocha hover:text-white cursor-pointer group transition-all duration-75 hover:shadow-clay-soft border border-transparent hover:border-cocoa-taupe-dark"
        >
          <Mail className="h-5 w-5 mr-3 text-cocoa-taupe group-hover:text-white transition-all duration-75 group-hover:scale-110" />
          <span className="font-medium text-sm">Contacto por Email</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 mx-3 bg-pale-clay-medium" />

        {/* Logout */}
        <DropdownMenuItem 
          onClick={onLogout}
          className="mx-3 mb-3 mt-1 px-4 py-3 rounded-xl hover:bg-error-gentle text-error-strong hover:text-white cursor-pointer group transition-all duration-75 hover:shadow-clay-medium border-2 border-transparent hover:border-error-strong"
        >
          <LogOut className="h-5 w-5 mr-3 text-error-strong group-hover:text-white transition-all duration-75 group-hover:scale-110 group-hover:-translate-x-1" />
          <span className="font-semibold text-sm">Terminar Sessão</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}