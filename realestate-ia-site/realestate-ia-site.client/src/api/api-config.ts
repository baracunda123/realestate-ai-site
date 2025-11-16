// api-config.ts - Configuração centralizada dos endpoints da API

// Environment configuration - values will be injected at build time by Vite
const ENV_VARS = {
  BASE_URL: '',
  DEBUG_LOGS: false,
  MOCK_DATA: false,
  IS_DEV: process.env.NODE_ENV === 'development',
  IS_PROD: process.env.NODE_ENV === 'production'
};

export const API_CONFIG = {
  // Base configuration
  BASE_URL: ENV_VARS.BASE_URL,
  TIMEOUT: 60000,
  
  // API Endpoints - Minificados para produção
  ENDPOINTS: (() => {
    const isDev = ENV_VARS.IS_DEV;
    
    // Em produção, usar apenas as rotas necessárias
    const baseEndpoints = {
      // Authentication (sempre visível)
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
      
      // Search (público)
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

  // Error messages (minificados em produção)
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
  
  // Use Object.keys for compatibility
  Object.keys(params).forEach(key => {
    const value = params[key];
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
    API_CONFIG.ENDPOINTS.SEARCH.AI
  ];
  
  return !publicEndpoints.some(publicEndpoint => endpoint.includes(publicEndpoint));
};

// Configurações de ambiente
export const ENV_CONFIG = {
  isDevelopment: ENV_VARS.IS_DEV,
  isProduction: ENV_VARS.IS_PROD,
  apiUrl: ENV_VARS.BASE_URL,
  enableDebugLogs: ENV_VARS.DEBUG_LOGS,
  enableMockData: ENV_VARS.MOCK_DATA
} as const;

// Export default
export default API_CONFIG;