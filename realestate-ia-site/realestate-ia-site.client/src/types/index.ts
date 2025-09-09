// types/index.ts - Export central de todos os tipos
export type { 
  Property, 
  PropertyType, 
  PropertyFilters, 
  CreatePropertyRequest 
} from './property';

export type {
  User,
  SavedSearch,
  PropertyAlert,
  ViewHistoryItem,
  UserLoginSession,
  Subscription,
  PlanLimits,
  NotificationSettings,
  ActivityItem,
  PersonalAreaProps,
  UserProfileResponse,
  AlertsResponse,
  SavedSearchesResponse,
  CreateAlertRequest,
  UpdateAlertRequest,
  CreateSavedSearchRequest,
  UpdateUserProfileRequest,
  UpdateNotificationSettingsRequest
} from './PersonalArea';

export type {
  SearchFilters,
  SearchFiltersType,
  SearchRequest,
  SearchResponse,
  LocationSuggestion,
  PropertyTypeSuggestion,
  SavedFilter,
  DEFAULT_SEARCH_FILTERS,
  PROPERTY_TYPES,
  SORT_OPTIONS
} from './SearchFilters';

// Re-export client types
export type {
  TokenResponse,
  UserProfile,
  ApiResponse,
  ApiError
} from '../api/client';

// Re-export API config
export { API_CONFIG, ENV_CONFIG, buildUrl, requiresAuth, requiresPremium } from '../api/api-config';

// Type guards úteis
export const isProperty = (obj: unknown): obj is Property => {
  return obj && typeof obj === 'object' && typeof (obj as Property).id === 'string';
};

export const isUser = (obj: unknown): obj is User => {
  return obj && typeof obj === 'object' && typeof (obj as User).id === 'string' && typeof (obj as User).email === 'string';
};

export const isPropertyAlert = (obj: unknown): obj is PropertyAlert => {
  return obj && typeof obj === 'object' && typeof (obj as PropertyAlert).id === 'string' && typeof (obj as PropertyAlert).name === 'string';
};

export const isSavedSearch = (obj: unknown): obj is SavedSearch => {
  return obj && typeof obj === 'object' && typeof (obj as SavedSearch).id === 'string' && typeof (obj as SavedSearch).query === 'string';
};

// Constants úteis
export const APP_CONSTANTS = {
  // Planos
  PLANS: {
    FREE: 'free',
    PREMIUM: 'premium'
  },
  
  // Limites por plano
  LIMITS: {
    FREE: {
      FAVORITES: 5,
      SAVED_SEARCHES: 3,
      ALERTS: 1
    },
    PREMIUM: {
      FAVORITES: Infinity,
      SAVED_SEARCHES: Infinity,
      ALERTS: Infinity
    }
  },
  
  // Status de propriedades
  PROPERTY_STATUS: {
    ACTIVE: 'active',
    SOLD: 'sold',
    RENTED: 'rented',
    WITHDRAWN: 'withdrawn'
  },
  
  // Tipos de notificação
  NOTIFICATION_TYPES: {
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push'
  },
  
  // Prioridades de alerta
  ALERT_PRIORITIES: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent'
  }
} as const;

// Constants de segurança
export const SECURITY_CONSTANTS = {
  // Tamanhos máximos
  MAX_INPUT_LENGTH: {
    EMAIL: 254,
    PASSWORD: 128,
    NAME: 100,
    SEARCH_QUERY: 500,
    DESCRIPTION: 2000
  },
  
  // Patterns permitidos
  ALLOWED_PATTERNS: {
    ALPHANUMERIC: /^[a-zA-Z0-9\s]+$/,
    EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    PHONE: /^[+]?[1-9][\d]{0,15}$/,
    URL: /^https?:\/\/[\w-]+(\.[\w-]+)+([\w-.,@?^=%&:/~+#]*[\w-@?^=%&/~+#])?$/
  },
  
  // Rate limiting
  RATE_LIMITS: {
    LOGIN_ATTEMPTS: 5,
    API_CALLS_PER_MINUTE: 60,
    SEARCH_CALLS_PER_MINUTE: 30
  }
} as const;

// Type guards seguros
export const isSecureString = (input: unknown): input is string => {
  if (typeof input !== 'string') return false;
  if (input.length > SECURITY_CONSTANTS.MAX_INPUT_LENGTH.DESCRIPTION) return false;
  
  const validation = InputValidationService.validateUserInput(input, 'text');
  return validation.isValid;
};

export const isSecureEmail = (input: unknown): input is string => {
  if (typeof input !== 'string') return false;
  if (input.length > SECURITY_CONSTANTS.MAX_INPUT_LENGTH.EMAIL) return false;
  
  return SECURITY_CONSTANTS.ALLOWED_PATTERNS.EMAIL.test(input);
};

// Utility types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ResponseStatus = 'success' | 'error' | 'loading';

// Union types úteis
export type PropertySortBy = 'price' | 'area' | 'bedrooms' | 'date' | 'relevance';
export type UserPlan = 'free' | 'premium';
export type AlertStatus = 'active' | 'inactive' | 'paused';
export type SearchStatus = 'saved' | 'executed' | 'expired';

// Generic response wrapper
export interface ApiResponseWrapper<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  meta?: {
    page?: number;
    pageSize?: number;
    totalCount?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ValidationError[];
  code?: string;
  statusCode?: number;
}

// Event types para analytics
export interface AnalyticsEvent {
  type: 'property_view' | 'search' | 'favorite_add' | 'alert_create' | 'user_signup' | 'upgrade';
  userId?: string;
  sessionId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface SecurityValidationResult {
  isValid: boolean;
  errors: string[];
  sanitized: string;
}

export interface SecureApiRequest {
  validateInput: boolean;
  sanitizeOutput: boolean;
  logSecurityEvents: boolean;
}

// Export all as namespace
export * as Types from './index';