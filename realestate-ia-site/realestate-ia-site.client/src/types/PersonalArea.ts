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

// SavedSearch - estrutura para pesquisas salvas (localStorage ou futura BD)
export interface SavedSearch {
  id: string;
  userId?: string; // Para futura associação com BD
  name: string;
  query: string;
  filters: {
    location?: string;
    propertyType?: string;
    priceRange?: [number, number];
    bedrooms?: number;
    bathrooms?: number;
    hasGarage?: boolean;
  };
  createdAt: Date;
  updatedAt?: Date;
  results: number;
  newResults: number;
}

// PropertyAlert simplificado - apenas alertas de redução de preço
export interface PropertyAlert {
  id: string;
  userId: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  currentPrice: number;
  alertThresholdPercentage: number; // % de redução necessária
  isActive: boolean;
  createdAt: Date;
  lastTriggered: Date | null;
  notificationCount: number;

  // Campos calculados para UI
  property?: Property;
  formattedThreshold?: string;
}

// DTO para notificações de redução de preço
export interface PropertyAlertNotification {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyLocation: string;
  currentPrice: number;
  oldPrice: number;
  savingsAmount: number;
  savingsPercentage: number;
  createdAt: Date;
  isRead: boolean;
  
  // Campos calculados para UI
  property?: Property;
  isRecent?: boolean;
  formattedTime?: string;
  formattedSavings?: string;
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


// Notification settings para utilizador
export interface NotificationSettings {
  priceAlerts: boolean;
  alertFrequency: 'immediate' | 'daily' | 'weekly';
}

// Activity tracking
export interface ActivityItem {
  id: string;
  userId?: string;
  type: 'favorite' | 'alert' | 'search' | 'view' | 'signup' | 'login';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  metadata?: Record<string, string | number | boolean>;
  propertyId?: string;
  alertId?: string;
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

export interface AlertsResponse {
  alerts: PropertyAlert[];
  totalCount: number;
  activeCount: number;
}

export interface SavedSearchesResponse {
  searches: SavedSearch[];
  totalCount: number;
}

export interface AlertNotificationsResponse {
  notifications: PropertyAlertNotification[];
  totalCount: number;
  unreadCount: number;
}

// Create/Update request types para alertas de preço
export interface CreatePriceAlertRequest {
  propertyId: string;
  alertThresholdPercentage?: number; // Default 5%
}

export interface UpdatePriceAlertRequest {
  alertThresholdPercentage?: number;
  isActive?: boolean;
}

export interface CreateSavedSearchRequest {
  name: string;
  query: string;
  filters: SavedSearch['filters'];
  results: number;
}

// Create/Update request types para perfil de utilizador
export interface UpdateUserProfileRequest {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

// Create/Update request types para definições de notificação
export interface UpdateNotificationSettingsRequest {
  priceAlerts?: boolean;
  alertFrequency?: 'immediate' | 'daily' | 'weekly';
}

// Utility functions para alertas de preço
export const PriceAlertUtils = {
  /**
   * Formatar percentual de desconto mínimo
   */
  formatThreshold(percentage: number): string {
    return `${percentage}% ou mais`;
  },

  /**
   * Formatar poupança
   */
  formatSavings(amount: number, percentage: number): string {
    return `€${amount.toLocaleString('pt-PT')} (-${percentage.toFixed(1)}%)`;
  },

  /**
   * Verificar se a notificação é recente (menos de 1 hora)
   */
  isRecent(createdAt: Date | string): boolean {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
    return diffMinutes < 60;
  },

  /**
   * Formatar tempo relativo
   */
  formatRelativeTime(createdAt: Date | string): string {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Agora mesmo';
    if (diffMinutes < 60) return `${diffMinutes}min atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return created.toLocaleDateString('pt-PT');
  },

  /**
   * Calcular cor do alerta baseado na poupança
   */
  getSavingsColor(percentage: number): string {
    if (percentage >= 20) return 'text-green-600';
    if (percentage >= 10) return 'text-yellow-600';
    return 'text-orange-600';
  },

  /**
   * Obter ícone baseado na poupança
   */
  getSavingsIcon(percentage: number): string {
    if (percentage >= 20) return '🎉';
    if (percentage >= 10) return '💰';
    return '📉';
  }
};