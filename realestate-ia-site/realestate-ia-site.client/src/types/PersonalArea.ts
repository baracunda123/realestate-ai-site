import type { Property } from './property';

// User interface alinhada com Entity User da BD
export interface User {
  // Campos obrigat�rios da BD
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
  emailNotifications: boolean;
  smsNotifications: boolean;
  priceDropAlerts: boolean;
  newListingAlerts: boolean;
  isActive: boolean;
  createdAt: Date;
  lastTriggered: Date | null;
  matchCount: number;
  newMatches: number;
  
  // Campos calculados para UI
  priceRange?: [number, number]; // Derivado de minPrice/maxPrice
  notifications?: {
    email: boolean;
    sms: boolean;
    priceDrops: boolean;
    newListings: boolean;
  };
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
  email: boolean;
  sms: boolean;
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

// Create/Update request types para alertas
export interface CreateAlertRequest {
  name: string;
  location?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
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
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  priceDropAlerts?: boolean;
  newListingAlerts?: boolean;
}