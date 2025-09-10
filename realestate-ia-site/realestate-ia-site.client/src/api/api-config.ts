// api-config.ts - Configura��o centralizada dos endpoints da API
export const API_CONFIG = {
  // Base configuration
  BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  TIMEOUT: 30000,
  
  // API Endpoints - Minificados para produ��o
  ENDPOINTS: (() => {
    const isDev = import.meta.env.DEV;
    
    // Em produ��o, usar apenas as rotas necess�rias
    const baseEndpoints = {
      // Authentication (sempre vis�vel)
      AUTH: {
        LOGIN: '/api/auth/login',
        REGISTER: '/api/auth/register',
        LOGOUT: '/api/auth/logout',
        REFRESH_TOKEN: '/api/auth/refresh-token',
        USER: '/api/auth/user',
        CONFIRM_EMAIL: '/api/auth/confirm-email',
        FORGOT_PASSWORD: '/api/auth/forgot-password',
        RESET_PASSWORD: '/api/auth/reset-password'
      },
      
      // Search (p�blico)
      SEARCH: {
        AI: '/api/SearchAI'
      },

      // Core features (descobertos dinamicamente)
      FAVORITES: {
        LIST: '/api/favorites',
        ADD: '/api/favorites',
        REMOVE: (id: string) => `/api/favorites/${id}`
      }
    };

    // Em desenvolvimento, expor todos os endpoints para facilitar debug
    if (isDev) {
      return {
        ...baseEndpoints,
        
        // Desenvolvimento - endpoints completos
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

        SAVED_SEARCHES: {
          LIST: '/api/saved-searches',
          DETAILS: (id: string) => `/api/saved-searches/${id}`,
          CREATE: '/api/saved-searches',
          UPDATE: (id: string) => `/api/saved-searches/${id}`,
          DELETE: (id: string) => `/api/saved-searches/${id}`,
          EXPORT: '/api/saved-searches/export'
        },

        NOTIFICATIONS: {
          LIST: '/api/notifications',
          MARK_READ: (id: string) => `/api/notifications/${id}/read`,
          MARK_ALL_READ: '/api/notifications/mark-all-read',
          DELETE: (id: string) => `/api/notifications/${id}`,
          SETTINGS: '/api/notifications/settings'
        },


        DASHBOARD: {
          STATS: '/api/dashboard/stats',
          ACTIVITY: '/api/dashboard/activity',
          INSIGHTS: '/api/dashboard/insights'
        }
      };
    }

    return baseEndpoints;
  })(),

  // Request headers
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },

  // Error messages (minificados em produ��o)
  ERROR_MESSAGES: {
    NETWORK_ERROR: 'Erro de rede. Verifique sua conex�o.',
    UNAUTHORIZED: 'Sess�o expirada. Fa�a login novamente.',
    FORBIDDEN: 'Acesso negado.',
    NOT_FOUND: 'Recurso n�o encontrado.',
    SERVER_ERROR: 'Erro interno do servidor.',
    TIMEOUT: 'Timeout na requisi��o.',
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

// Helper para verificar se endpoint requer autentica��o
export const requiresAuth = (endpoint: string): boolean => {
  const publicEndpoints = [
    API_CONFIG.ENDPOINTS.AUTH.LOGIN,
    API_CONFIG.ENDPOINTS.AUTH.REGISTER,
    API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD,
    API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD,
    API_CONFIG.ENDPOINTS.AUTH.CONFIRM_EMAIL,
    API_CONFIG.ENDPOINTS.SEARCH.AI
  ];
  
  return !publicEndpoints.some(publicEndpoint => endpoint.includes(publicEndpoint));
};


// Configura��es de ambiente
export const ENV_CONFIG = {
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  apiUrl: import.meta.env.VITE_API_BASE_URL || '',
  enableDebugLogs: import.meta.env.VITE_ENABLE_DEBUG_LOGS === 'true',
  enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA === 'true'
} as const;

// Export default
export default API_CONFIG;