import type { Property } from './property';

// User interface alinhada com Entity User da BD
export interface User {
  // Campos obrigatórios da BD
  id: string;
  email: string;
  
  // Campos opcionais da BD
  fullName?: string;
  name?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  credits?: string;
  
  // Campos calculados
  phone?: string; // Derivado de phoneNumber
  avatar?: string; // Derivado de avatarUrl
  
  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
  
  // Campos de autenticação (não expostos diretamente)
  isEmailVerified?: boolean;
  
  // Status da conta
  accountStatus?: 'active' | 'inactive' | 'suspended';
}

// Definições de tipos específicos para histórico de visualizações - SIMPLIFICADO
export interface ViewHistoryItem {
  id: string;
  viewedAt: string;
  property: Property; // Propriedade completa como nos favoritos
}

// UserLoginSession alinhado com BD Entity
export interface UserLoginSession {
  id: string;
  userId: string;
  sessionToken: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceInfo: string | null;
  loginAt: Date;
  logoutAt: Date | null;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
}


// Activity tracking
export interface ActivityItem {
  id: string;
  userId?: string;
  type: 'favorite' | 'search' | 'view' | 'signup' | 'login';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  metadata?: Record<string, string | number | boolean>;
  propertyId?: string;
}

// Component Props interfaces
export interface PersonalAreaProps {
  user: User;
  onPropertySelect?: (property: Property) => void;
  favorites: Property[];
  onToggleFavorite: (property: Property) => void;
}

// API response types
export interface UserProfileResponse {
  user: User;
  activeSessions: UserLoginSession[];
}

// Create/Update request types para perfil de utilizador
export interface UpdateUserProfileRequest {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}
