import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { User } from '../../types/PersonalArea';
import { formatDate, getUserInitials } from '../../utils/PersonalArea';

interface PersonalAreaHeaderProps {
  user: User;
}

export function PersonalAreaHeader({ user }: PersonalAreaHeaderProps) {
  // Use consistent initials function
  const userInitials = getUserInitials(user);
  const displayName = user.name || user.fullName || user.email.split('@')[0];

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
      <div className="flex items-center space-x-4">
        <Avatar className="h-16 w-16 border-3 border-burnt-peach shadow-clay-soft">
          <AvatarImage src={user.avatarUrl || user.avatar} alt={displayName} />
          <AvatarFallback className="bg-pale-clay-light text-deep-mocha text-lg font-bold">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-semibold text-foreground">Olá, {displayName}!</h1>
          </div>
          <p className="text-muted-foreground">
            Membro desde {formatDate(user.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}