import apiClient from './client';

export interface ChatUsageStats {
  usedPrompts: number;
  maxPrompts: number;
  remainingPrompts: number;
  usagePercentage: number;
  planType: 'free' | 'basic' | 'premium' | 'unlimited';
  periodStart: string;
  periodEnd: string;
  lastUsedAt?: string;
  hasActiveSubscription: boolean;
}

export interface QuotaExceededError {
  error: string;
  message: string;
  code: 'QUOTA_EXCEEDED';
  stats: {
    used: number;
    max: number;
    planType: string;
    periodEnd: string;
  };
}

interface ApiErrorResponse {
  response?: {
    data?: {
      code?: string;
      error?: string;
      message?: string;
      stats?: {
        used: number;
        max: number;
        planType: string;
        periodEnd: string;
      };
    };
  };
  code?: string;
  error?: string;
  message?: string;
  stats?: {
    used: number;
    max: number;
    planType: string;
    periodEnd: string;
  };
}

/**
 * Obter estatísticas de uso do chat
 */
export const getChatUsageStats = async (): Promise<ChatUsageStats> => {
  return await apiClient.get<ChatUsageStats>('/api/SearchAI/usage-stats');
};

/**
 * Verificar se erro é de quota excedida
 */
export const isQuotaExceededError = (error: unknown): error is QuotaExceededError => {
  const err = error as ApiErrorResponse;
  return err?.code === 'QUOTA_EXCEEDED' || err?.response?.data?.code === 'QUOTA_EXCEEDED';
};

/**
 * Extrair dados de erro de quota
 */
export const getQuotaErrorData = (error: unknown): QuotaExceededError | null => {
  const err = error as ApiErrorResponse;
  
  if (err?.response?.data?.code === 'QUOTA_EXCEEDED') {
    return {
      error: err.response.data.error || 'Quota exceeded',
      message: err.response.data.message || 'Chat quota limit reached',
      code: 'QUOTA_EXCEEDED',
      stats: err.response.data.stats || {
        used: 0,
        max: 0,
        planType: 'free',
        periodEnd: ''
      }
    };
  }
  
  if (err?.code === 'QUOTA_EXCEEDED') {
    return {
      error: err.error || 'Quota exceeded',
      message: err.message || 'Chat quota limit reached',
      code: 'QUOTA_EXCEEDED',
      stats: err.stats || {
        used: 0,
        max: 0,
        planType: 'free',
        periodEnd: ''
      }
    };
  }
  
  return null;
};

/**
 * Obter label do plano
 */
export const getPlanLabel = (planType: string): string => {
  const labels: Record<string, string> = {
    free: 'Gratuito',
    basic: 'Básico',
    premium: 'Premium',
    unlimited: 'Ilimitado'
  };
  return labels[planType] || planType;
};

/**
 * Obter cor do plano
 */
export const getPlanColor = (planType: string): string => {
  const colors: Record<string, string> = {
    free: 'gray',
    basic: 'blue',
    premium: 'purple',
    unlimited: 'gold'
  };
  return colors[planType] || 'gray';
};

/**
 * Formatar data de renovação
 */
export const formatRenewalDate = (periodEnd: string): string => {
  const date = new Date(periodEnd);
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date);
};
