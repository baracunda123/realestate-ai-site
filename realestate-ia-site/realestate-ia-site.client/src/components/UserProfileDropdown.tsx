import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { 
  LogOut, 
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="group flex items-center space-x-2 p-1 sm:p-1.5 h-auto hover:bg-accent rounded-full focus:outline-none focus-visible:ring-0"
        >
          <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border-2 border-border group-hover:border-accent">
            <AvatarImage src={user.avatar} alt={displayName} />
            <AvatarFallback className="bg-gradient-to-br from-muted to-accent/20 text-foreground text-sm font-medium">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex items-center pr-2">
            <span className="text-foreground group-hover:text-accent-foreground text-sm font-medium transition-colors">{displayName}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-[calc(100vw-2rem)] max-w-72 sm:w-72 max-h-[calc(100vh-5rem)] overflow-y-auto bg-card border border-border shadow-lg rounded-xl animate-in fade-in-0 zoom-in-95 duration-150"
      >
        {/* User Info Header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={user.avatar} alt={displayName} />
              <AvatarFallback className="bg-gradient-to-br from-accent to-primary text-primary-foreground font-medium text-sm">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate text-sm">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-1.5">
        <DropdownMenuItem 
          onClick={() => navigate('/profile')}
          className="mx-2 px-2 py-2 rounded-md hover:bg-accent text-foreground cursor-pointer group"
        >
          <UserCircle className="h-4 w-4 mr-2.5 text-muted-foreground group-hover:text-accent-foreground" />
          <span className="font-normal text-sm">Meu Perfil</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/favorites')}
          className="mx-2 px-2 py-2 rounded-md hover:bg-accent text-foreground cursor-pointer group"
        >
          <Heart className="h-4 w-4 mr-2.5 text-muted-foreground group-hover:text-accent-foreground" />
          <span className="font-normal text-sm">Favoritos</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/history')}
          className="mx-2 px-2 py-2 rounded-md hover:bg-accent text-foreground cursor-pointer group"
        >
          <Clock className="h-4 w-4 mr-2.5 text-muted-foreground group-hover:text-accent-foreground" />
          <span className="font-normal text-sm">Histórico</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => navigate('/settings')}
          className="mx-2 px-2 py-2 rounded-md hover:bg-accent text-foreground cursor-pointer group"
        >
          <Settings className="h-4 w-4 mr-2.5 text-muted-foreground group-hover:text-accent-foreground" />
          <span className="font-normal text-sm">Configurações</span>
        </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-1 bg-border" />

        <div className="py-1.5">
        <DropdownMenuItem 
          onClick={() => navigate('/pricing')}
          className="mx-2 px-2 py-2 rounded-md hover:bg-accent text-foreground cursor-pointer group"
        >
          <CreditCard className="h-4 w-4 mr-2.5 text-muted-foreground group-hover:text-accent-foreground" />
          <span className="font-normal text-sm">Ver Planos</span>
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => handleExternalLink('mailto:suporte@homefinder.ai')}
          className="mx-2 px-2 py-2 rounded-md hover:bg-accent text-foreground cursor-pointer group"
        >
          <Mail className="h-4 w-4 mr-2.5 text-muted-foreground group-hover:text-accent-foreground" />
          <span className="font-normal text-sm">Contacto</span>
        </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-1 bg-border" />

        <div className="py-1.5">
        <DropdownMenuItem 
          onClick={onLogout}
          className="mx-2 px-2 py-2 rounded-md hover:bg-accent text-foreground cursor-pointer group"
        >
          <LogOut className="h-4 w-4 mr-2.5 text-muted-foreground group-hover:text-accent-foreground" />
          <span className="font-normal text-sm">Terminar Sessão</span>
        </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}