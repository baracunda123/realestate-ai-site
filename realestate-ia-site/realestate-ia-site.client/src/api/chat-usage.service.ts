import apiClient from './client';

export interface ChatUsageStats {
  usedPrompts: number;
  maxPrompts: number;
  remainingPrompts: number;
  usagePercentage: number;
  planType: 'free' | 'premium';
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
 * Obter estatisticas de uso do chat
 */
export const getChatUsageStats = async (): Promise<ChatUsageStats> => {
  return await apiClient.get<ChatUsageStats>('/api/SearchAI/usage-stats');
};

/**
 * Verificar se erro e de quota excedida
 */
export const isQuotaExceededError = (error: unknown): error is QuotaExceededError => {
  const err = error as ApiErrorResponse;
  return err?.code === 'QUOTA_EXCEEDED' || err?.response?.data?.code === 'QUOTA_EXCEEDED';
};

/**
 * Obter label do plano
 */
export const getPlanLabel = (planType: string): string => {
  const labels: Record<string, string> = {
    free: 'Gratuito',
    premium: 'Premium'
  };
  return labels[planType] || planType;
};

/**
 * Formatar data de renovacao
 */
export const formatRenewalDate = (periodEnd: string): string => {
  const date = new Date(periodEnd);
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).format(date);
};
