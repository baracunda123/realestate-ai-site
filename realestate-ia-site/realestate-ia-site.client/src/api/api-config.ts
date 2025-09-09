// api-config.ts - Configuração centralizada dos endpoints da API
export const API_CONFIG = {
  // Base configuration
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  TIMEOUT: 30000,
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      LOGOUT: '/api/auth/logout',
      REFRESH_TOKEN: '/api/auth/refresh-token',
      USER: '/api/auth/user',
      CONFIRM_EMAIL: '/api/auth/confirm-email',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password',
      CHANGE_PASSWORD: '/api/auth/change-password',
      UPDATE_PROFILE: '/api/auth/profile',
      RESEND_CONFIRMATION: '/api/auth/resend-confirmation',
      SESSIONS: '/api/auth/sessions',
      REVOKE_SESSION: (sessionId: string) => `/api/auth/sessions/${sessionId}`,
      REVOKE_ALL_SESSIONS: '/api/auth/revoke-all-sessions',
      DELETE_ACCOUNT: '/api/auth/account'
    },
    
    // Search (the remaining property-related endpoints)
    SEARCH: {
      AI: '/api/SearchAI'
    },

    // Favorites (FavoritesController)
    FAVORITES: {
      LIST: '/api/favorites',
      ADD: '/api/favorites',
      REMOVE: (id: string) => `/api/favorites/${id}`,
      STATUS: (id: string) => `/api/favorites/${id}/status`,
      CLEAR_ALL: '/api/favorites'
    },
    
    // Property Alerts
    ALERTS: {
      LIST: '/api/alerts',
      DETAILS: (id: string) => `/api/alerts/${id}`,
      CREATE: '/api/alerts',
      UPDATE: (id: string) => `/api/alerts/${id}`,
      TOGGLE: (id: string) => `/api/alerts/${id}/toggle`,
      DELETE: (id: string) => `/api/alerts/${id}`,
      TEST: '/api/alerts/test',
      MATCHES: (id: string) => `/api/alerts/${id}/matches`,
      MARK_VIEWED: (id: string) => `/api/alerts/${id}/mark-viewed`,
      STATS: '/api/alerts/stats',
      EXPORT: '/api/alerts/export'
    },

    // Saved Searches
    SAVED_SEARCHES: {
      LIST: '/api/saved-searches',
      DETAILS: (id: string) => `/api/saved-searches/${id}`,
      CREATE: '/api/saved-searches',
      UPDATE: (id: string) => `/api/saved-searches/${id}`,
      DELETE: (id: string) => `/api/saved-searches/${id}`,
      EXPORT: '/api/saved-searches/export'
    },

    // Notifications
    NOTIFICATIONS: {
      LIST: '/api/notifications',
      MARK_READ: (id: string) => `/api/notifications/${id}/read`,
      MARK_ALL_READ: '/api/notifications/mark-all-read',
      DELETE: (id: string) => `/api/notifications/${id}`,
      SETTINGS: '/api/notifications/settings'
    },

    // Payments/Subscriptions
    PAYMENTS: {
      SUBSCRIPTION: '/api/subscription',
      BILLING_PORTAL: '/api/subscription/billing-portal',
      CHECKOUT: '/api/subscription/checkout',
      WEBHOOK: '/api/subscription/webhook',
      PLANS: '/api/subscription/plans',
      CURRENT_PLAN: '/api/subscription/current',
      USAGE: '/api/subscription/usage'
    },

    // Dashboard/Analytics
    DASHBOARD: {
      STATS: '/api/dashboard/stats',
      ACTIVITY: '/api/dashboard/activity',
      INSIGHTS: '/api/dashboard/insights'
    }
  },

  // Request headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },

  // Error messages
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Erro de rede. Verifique sua conexão.',
    UNAUTHORIZED: 'Sessão expirada. Faça login novamente.',
    FORBIDDEN: 'Acesso negado.',
    NOT_FOUND: 'Recurso não encontrado.',
    SERVER_ERROR: 'Erro interno do servidor.',
    TIMEOUT: 'Timeout na requisição.',
    UNKNOWN: 'Erro desconhecido.'
  }
} as const;

// Helper functions para construir URLs
export const buildUrl = (endpoint: string, params?: Record<string, string | number | boolean>) => {
  if (!params) return endpoint;
  
  const url = new URL(endpoint, API_CONFIG.BASE_URL || window.location.origin);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  });
  
  return url.toString();
};

// Helper para verificar se endpoint requer autenticação
export const requiresAuth = (endpoint: string): boolean => {
  const publicEndpoints = [
    API_CONFIG.ENDPOINTS.AUTH.LOGIN,
    API_CONFIG.ENDPOINTS.AUTH.REGISTER,
    API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD,
    API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD,
    API_CONFIG.ENDPOINTS.AUTH.CONFIRM_EMAIL,
    API_CONFIG.ENDPOINTS.SEARCH.AI,
    API_CONFIG.ENDPOINTS.PAYMENTS.PLANS
  ];
  
  return !publicEndpoints.some(publicEndpoint => endpoint.includes(publicEndpoint));
};

// Helper para verificar se endpoint requer Premium
export const requiresPremium = (endpoint: string): boolean => {
  const premiumEndpoints = [
    API_CONFIG.ENDPOINTS.DASHBOARD.STATS,
    API_CONFIG.ENDPOINTS.DASHBOARD.INSIGHTS,
    API_CONFIG.ENDPOINTS.ALERTS.EXPORT
  ];
  
  return premiumEndpoints.some(premiumEndpoint => endpoint.includes(premiumEndpoint));
};

// Configurações de ambiente
export const ENV_CONFIG = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  apiUrl: import.meta.env.VITE_API_BASE_URL || '',
  enableDebugLogs: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true',
  enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true'
} as const;

// Export default
export default API_CONFIG;