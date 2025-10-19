import { Bell } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface NotificationBellProps {
  onClick?: () => void;
  className?: string;
  unreadCount?: number;
  isLoading?: boolean;
}

/**
 * Componente de sininho para notificações na barra de navegação
 * Mostra um badge com a contagem de notificações não lidas
 */
export function NotificationBell({ 
  onClick, 
  className = '', 
  unreadCount = 0, 
  isLoading = false 
}: NotificationBellProps) {
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onClick}
      className={`relative p-0 h-9 w-9 sm:h-10 sm:w-10 ${className}`}
      disabled={isLoading}
      title={`${unreadCount > 0 ? `${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}` : 'Notificações'}`}
    >
      <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
      {unreadCount > 0 && (
        <Badge 
          className="absolute -top-1 -right-1 bg-burnt-peach text-white text-xs h-5 min-w-5 flex items-center justify-center rounded-full border-2 border-white p-0"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
    </Button>
  );
}

/**
 * Exemplo de como usar em uma navbar:
 * 
 * <NotificationBell 
 *   onClick={() => navigateToPersonalArea('alerts')}
 *   className="hover:bg-burnt-peach/10"
 * />
 */