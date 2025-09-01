import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Crown, Eye } from 'lucide-react';
import type { User } from '../../types/PersonalArea';
import { formatDate } from '../../utils/PersonalArea';

interface PersonalAreaHeaderProps {
  user: User;
  onOpenUpgradeModal?: () => void;
}

export function PersonalAreaHeader({ user, onOpenUpgradeModal }: PersonalAreaHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16 border-3 border-burnt-peach shadow-clay-soft">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-pale-clay-light text-pure-white text-lg font-bold">
            {user.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-semibold text-foreground">Olá, {user.name}!</h1>
            {user.isPremium ? (
              <Badge className="bg-burnt-peach text-pure-white border-0">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            ) : (
              <Badge className="bg-pale-clay-deep text-deep-mocha border-0">
                <Eye className="h-3 w-3 mr-1" />
                Free
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Membro desde {formatDate(user.createdAt)} • 
            Plano {user.isPremium ? 'Premium' : 'Free'}
          </p>
        </div>
      </div>
      
      {!user.isPremium && (
        <Button 
          className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white shadow-clay-medium"
          onClick={onOpenUpgradeModal}
        >
          <Crown className="h-4 w-4 mr-2" />
          Upgrade para Premium
        </Button>  
      )}
    </div>
  );
}