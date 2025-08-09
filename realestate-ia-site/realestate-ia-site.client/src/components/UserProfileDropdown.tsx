import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  User,
  Heart,
  Search,
  Settings,
  Bell,
  CreditCard,
  LogOut,
  Sparkles,
  Home,
  TrendingUp
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
}

export function UserProfileDropdown({ user, onLogout }: UserProfileDropdownProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-10 w-10 rounded-full p-0 hover:bg-gray-100">
          <Avatar className="h-9 w-9 border border-gray-200">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-gray-600 text-white text-sm">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 p-0 border border-gray-200 bg-white" align="end">
        {/* User Info Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12 border border-gray-200">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-gray-600 text-white">
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <p className="font-medium text-gray-900 truncate">{user.name}</p>
                {user.isPremium && (
                  <Badge className="bg-gray-800 text-white border-0 text-xs">
                    <Sparkles className="h-2 w-2 mr-1" />
                    Premium
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-3 border-b border-gray-100">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="space-y-1">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                <Heart className="h-4 w-4 text-gray-600" />
              </div>
              <div className="text-xs font-medium text-gray-900">12</div>
              <div className="text-xs text-gray-500">Favoritos</div>
            </div>
            <div className="space-y-1">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                <Search className="h-4 w-4 text-gray-600" />
              </div>
              <div className="text-xs font-medium text-gray-900">47</div>
              <div className="text-xs text-gray-500">Buscas</div>
            </div>
            <div className="space-y-1">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mx-auto">
                <TrendingUp className="h-4 w-4 text-gray-600" />
              </div>
              <div className="text-xs font-medium text-gray-900">5</div>
              <div className="text-xs text-gray-500">Alertas</div>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2">
          <DropdownMenuItem className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Meu Perfil</div>
              <div className="text-xs text-gray-500">Informações pessoais</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Heart className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Favoritos</div>
              <div className="text-xs text-gray-500">Propriedades salvas</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Buscas IA</div>
              <div className="text-xs text-gray-500">Histórico e recomendações</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Bell className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Alertas</div>
              <div className="text-xs text-gray-500">Notificações de preços</div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Settings className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Configurações</div>
              <div className="text-xs text-gray-500">Preferências da conta</div>
            </div>
          </DropdownMenuItem>

          {!user.isPremium && (
            <DropdownMenuItem className="flex items-center space-x-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
              <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Upgrade Premium</div>
                <div className="text-xs text-gray-500">Recursos exclusivos</div>
              </div>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            className="flex items-center space-x-3 px-4 py-2 hover:bg-red-50 cursor-pointer text-red-600"
            onClick={onLogout}
          >
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
              <LogOut className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <div className="text-sm font-medium">Sair</div>
              <div className="text-xs text-red-500">Desconectar da conta</div>
            </div>
          </DropdownMenuItem>
        </div>

        {/* Premium Upgrade Banner */}
        {!user.isPremium && (
          <div className="p-3 border-t border-gray-100">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gray-800 rounded-md flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-800">HomeFinder Premium</div>
                  <div className="text-xs text-gray-600">Busca AI avançada + alertas ilimitados</div>
                </div>
              </div>
              <Button size="sm" className="w-full mt-2 bg-gray-800 hover:bg-gray-900 text-white border-0">
                Upgrade Agora
              </Button>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}