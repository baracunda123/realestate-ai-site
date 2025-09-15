import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { User } from '../../types/PersonalArea';
import { formatDate } from '../../utils/PersonalArea';

interface PersonalAreaHeaderProps {
  user: User;
}

export function PersonalAreaHeader({ user }: PersonalAreaHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16 border-3 border-burnt-peach shadow-clay-soft">
          <AvatarImage src={user.avatar} alt={user.name || user.fullName || user.email} />
          <AvatarFallback className="bg-pale-clay-light text-pure-white text-lg font-bold">
            {(user.name || user.fullName || user.email).split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-semibold text-foreground">Olá, {user.name || user.fullName || user.email}!</h1>
          </div>
          <p className="text-muted-foreground">
            Membro desde {formatDate(user.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}