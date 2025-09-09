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
  subscription?: string;
  credits?: string;
  
  // Campos calculados
  phone?: string; // Derivado de phoneNumber
  avatar?: string; // Derivado de avatarUrl
  isPremium?: boolean; // Calculado baseado em subscription
  
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

// Subscription alinhado com BD Entity
export interface Subscription {
  id: string;
  userId: string | null;
  stripeId: string | null;
  customerId: string | null;
  priceId: string | null;
  stripePriceId: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  interval: string | null;
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean | null;
  canceledAt: number | null;
  endedAt: number | null;
  endsAt: number | null;
  startedAt: number | null;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, string | number | boolean>;
  customFieldData?: Record<string, string | number | boolean>;
  customerCancellationReason?: string;
  customerCancellationComment?: string;
}

// Plan limits baseados no tipo de subscription
export interface PlanLimits {
  maxFavorites: number;
  maxSavedSearches: number;
  maxPriceAlerts: number;
  hasAdvancedAnalytics: boolean;
  hasMarketInsights: boolean;
  hasPrioritySupport: boolean;
  hasSmsNotifications: boolean;
  hasPriceDropAlerts: boolean;
  hasCustomAlerts: boolean;
}

// Notification settings para usuário
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
  onOpenUpgradeModal?: () => void;
  onNavigateToAlertResults?: (alert: PropertyAlert) => void;
  favorites: Property[];
  onToggleFavorite: (property: Property) => void;
}

// API response types
export interface UserProfileResponse {
  user: User;
  subscription?: Subscription;
  activeSessions: UserLoginSession[];
  planLimits: PlanLimits;
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

// Create/Update request types
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

export interface UpdateUserProfileRequest {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

export interface UpdateNotificationSettingsRequest {
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  priceDropAlerts?: boolean;
  newListingAlerts?: boolean;
}