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

// PropertyAlert alinhado com BD Model PropertyAlert
export interface PropertyAlert {
  // Campos da BD
  id: string;
  userId: string;
  name: string;
  location: string | null;
  propertyType: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  priceDropAlerts: boolean;
  newListingAlerts: boolean;
  isActive: boolean;
  createdAt: Date;
  lastTriggered: Date | null;
  matchCount: number;
  newMatches: number;
  
  // Campos calculados para UI
  priceRange?: [number, number]; // Derivado de minPrice/maxPrice
}

// PropertyRecommendation alinhado com BD Model PropertyRecommendation
export interface PropertyRecommendation {
  id: string;
  userId: string;
  propertyId: string;
  score: number;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
  viewedAt?: Date;
  isActive: boolean;
  
  // Campos calculados para UI
  property?: Property;
  reasonText?: string;
  isNew?: boolean;
}

// Tipos específicos de alertas para type safety
export type AlertType = 'new_listing' | 'price_drop' | 'back_to_market' | 'status_change';

// PropertyAlertNotification alinhado com BD Model PropertyAlertNotification
export interface PropertyAlertNotification {
  id: string;
  userId: string;
  propertyId: string;
  alertId: string;
  alertType: AlertType; // Tipado específico
  title: string;
  message: string;
  createdAt: Date;
  readAt?: Date;
  isActive: boolean;
  propertyPrice?: number;
  oldPrice?: number;
  propertyLocation?: string;
  
  // Campos calculados para UI
  property?: Property;
  alert?: PropertyAlert;
  isRecent?: boolean;
  formattedTime?: string;
  
  // Dados adicionais da API para mostrar na notificação
  propertyTitle?: string;
  propertyType?: string;
  bedrooms?: number;
}

// Utility types para notificações
export interface AlertNotificationMeta {
  type: AlertType;
  title: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  actionText: string;
}

// ViewHistory - estrutura para histórico de visualizações
export interface ViewHistoryItem {
  id: string;
  userId?: string;
  propertyId: string;
  propertyTitle: string;
  location: string;
  price: number;
  viewedAt: Date;
  viewCount: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
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
  newListings: boolean;
  marketInsights: boolean;
  weeklyDigest: boolean;
  alertFrequency: 'immediate' | 'daily' | 'weekly';
}

// Activity tracking
export interface ActivityItem {
  id: string;
  userId?: string;
  type: 'favorite' | 'alert' | 'search' | 'view' | 'signup' | 'login' | 'recommendation';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  metadata?: Record<string, string | number | boolean>;
  propertyId?: string;
  alertId?: string;
  recommendationId?: string;
}

// Component Props interfaces
export interface PersonalAreaProps {
  user: User;
  onPropertySelect: (property: Property) => void;
  onNavigateToAlertResults?: (alert: PropertyAlert) => void;
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

export interface RecommendationsResponse {
  recommendations: PropertyRecommendation[];
  totalCount: number;
  newCount: number;
}

export interface AlertNotificationsResponse {
  notifications: PropertyAlertNotification[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
}

// Create/Update request types para alertas
export interface CreateAlertRequest {
  name: string;
  location?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  priceDropAlerts?: boolean;
  newListingAlerts?: boolean;
}

export interface UpdateAlertRequest extends Partial<CreateAlertRequest> {
  id: string;
  isActive?: boolean;
}

export interface CreateSavedSearchRequest {
  name: string;
  query: string;
  filters: SavedSearch['filters'];
}

// Create/Update request types para perfil de utilizador
export interface UpdateUserProfileRequest {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

// Create/Update request types para definições de notificação
export interface UpdateNotificationSettingsRequest {
  priceDropAlerts?: boolean;
  newListingAlerts?: boolean;
}

// Utility functions para tipos de notificação
export const AlertTypeUtils = {
  /**
   * Obter metadados de um tipo de alerta
   */
  getMeta(type: AlertType): AlertNotificationMeta {
    const metaMap: Record<AlertType, AlertNotificationMeta> = {
      new_listing: {
        type: 'new_listing',
        title: 'Nova Propriedade',
        description: 'Encontrámos uma nova propriedade que corresponde aos seus critérios',
        icon: '🏠',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        actionText: 'Ver Propriedade'
      },
      price_drop: {
        type: 'price_drop',
        title: 'Redução de Preço',
        description: 'Uma propriedade do seu interesse teve o preço reduzido',
        icon: '💰',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        actionText: 'Ver Desconto'
      },
      back_to_market: {
        type: 'back_to_market',
        title: 'Voltou ao Mercado',
        description: 'Uma propriedade que saiu voltou ao mercado',
        icon: '🔄',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        actionText: 'Ver Propriedade'
      },
      status_change: {
        type: 'status_change',
        title: 'Mudança de Status',
        description: 'O status de uma propriedade foi alterado',
        icon: '📋',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        actionText: 'Ver Alteração'
      }
    };
    
    return metaMap[type];
  },

  /**
   * Verificar se é um tipo de notificação de preço
   */
  isPriceRelated(type: AlertType): boolean {
    return type === 'price_drop';
  },

  /**
   * Verificar se é um tipo de notificação de nova propriedade
   */
  isNewProperty(type: AlertType): boolean {
    return type === 'new_listing' || type === 'back_to_market';
  },

  /**
   * Formatar mensagem de mudança de preço
   */
  formatPriceChange(currentPrice?: number, oldPrice?: number): string {
    if (!currentPrice || !oldPrice) return '';
    
    const difference = oldPrice - currentPrice; // Diferença positiva para descidas
    const percentage = ((difference / oldPrice) * 100).toFixed(1);
    
    if (difference > 0) {
      return `Poupança de €${difference.toLocaleString()} (-${percentage}%)`;
    } else {
      const increase = Math.abs(difference);
      return `Aumento de €${increase.toLocaleString()} (+${Math.abs(parseFloat(percentage))}%)`;
    }
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
  }
};