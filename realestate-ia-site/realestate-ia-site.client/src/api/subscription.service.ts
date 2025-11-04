// subscription.service.ts - Serviço de subscrições e pagamentos
import apiClient from './client';
import { logger } from '../utils/logger';

// Request types
export interface CreateSubscriptionRequest {
  priceId: string;
}

export interface UpdateSubscriptionRequest {
  newPriceId: string;
}

export interface CancelSubscriptionRequest {
  reason?: string;
  comment?: string;
  cancelImmediately?: boolean;
}

// Response types
export interface SubscriptionResult {
  success: boolean;
  message?: string;
  checkoutUrl?: string;
  subscriptionId?: string;
  customerId?: string;
  error?: string;
}

export interface SubscriptionDto {
  id: string;
  status: string;
  priceId: string;
  currency: string;
  interval: string;
  amount: number;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
}

/**
 * Criar nova subscrição
 */
export async function createSubscription(priceId: string): Promise<SubscriptionResult> {
  logger.info(`Criando subscrição com priceId: ${priceId}`, 'SUBSCRIPTION');
  
  try {
    const response = await apiClient.post<SubscriptionResult>(
      '/api/subscription/create',
      { priceId }
    );
    
    logger.info('Subscrição criada com sucesso', 'SUBSCRIPTION');
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao criar subscrição: ${errorMsg}`, 'SUBSCRIPTION');
    throw error;
  }
}

/**
 * Atualizar subscrição existente (upgrade/downgrade)
 */
export async function updateSubscription(newPriceId: string): Promise<SubscriptionResult> {
  logger.info(`Atualizando subscrição para priceId: ${newPriceId}`, 'SUBSCRIPTION');
  
  try {
    const response = await apiClient.put<SubscriptionResult>(
      '/api/subscription/update',
      { newPriceId }
    );
    
    logger.info('Subscrição atualizada com sucesso', 'SUBSCRIPTION');
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao atualizar subscrição: ${errorMsg}`, 'SUBSCRIPTION');
    throw error;
  }
}

/**
 * Cancelar subscrição
 */
export async function cancelSubscription(
  reason?: string,
  comment?: string
): Promise<SubscriptionResult> {
  logger.info('Cancelando subscrição', 'SUBSCRIPTION');
  
  try {
    const response = await apiClient.post<SubscriptionResult>(
      '/api/subscription/cancel',
      { reason, comment }
    );
    
    logger.info('Subscrição cancelada com sucesso', 'SUBSCRIPTION');
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao cancelar subscrição: ${errorMsg}`, 'SUBSCRIPTION');
    throw error;
  }
}

/**
 * Obter subscrição ativa atual
 */
export async function getCurrentSubscription(): Promise<SubscriptionDto | null> {
  logger.info('Buscando subscrição atual', 'SUBSCRIPTION');
  
  try {
    const response = await apiClient.get<SubscriptionDto | null>('/api/subscription/current');
    
    if (response) {
      logger.info(`Subscrição ativa encontrada: ${response.status}`, 'SUBSCRIPTION');
    } else {
      logger.info('Nenhuma subscrição ativa encontrada', 'SUBSCRIPTION');
    }
    
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao buscar subscrição atual: ${errorMsg}`, 'SUBSCRIPTION');
    throw error;
  }
}

/**
 * Obter histórico de subscrições
 */
export async function getSubscriptionHistory(): Promise<SubscriptionDto[]> {
  logger.info('Buscando histórico de subscrições', 'SUBSCRIPTION');
  
  try {
    const response = await apiClient.get<SubscriptionDto[]>('/api/subscription/history');
    
    logger.info(`${response.length} subscrições encontradas no histórico`, 'SUBSCRIPTION');
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao buscar histórico: ${errorMsg}`, 'SUBSCRIPTION');
    throw error;
  }
}

/**
 * Verificar status de subscrição ativa
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  logger.info('Verificando status de subscrição', 'SUBSCRIPTION');
  
  try {
    const response = await apiClient.get<SubscriptionStatus>('/api/subscription/status');
    
    logger.info(`Status: ${response.hasActiveSubscription ? 'ativa' : 'inativa'}`, 'SUBSCRIPTION');
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao verificar status: ${errorMsg}`, 'SUBSCRIPTION');
    throw error;
  }
}

// Utilidades
export const subscriptionUtils = {
  /**
   * Formatar valor monetário
   */
  formatAmount: (amount: number, currency: string = 'EUR'): string => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100); // Stripe usa valores em centavos
  },

  /**
   * Formatar intervalo de cobrança
   */
  formatInterval: (interval: string): string => {
    const intervals: Record<string, string> = {
      'month': 'mensal',
      'year': 'anual',
      'week': 'semanal',
      'day': 'diário'
    };
    return intervals[interval.toLowerCase()] || interval;
  },

  /**
   * Formatar status da subscrição
   */
  formatStatus: (status: string): string => {
    const statuses: Record<string, string> = {
      'active': 'Ativa',
      'trialing': 'Período de teste',
      'canceled': 'Cancelada',
      'incomplete': 'Incompleta',
      'incomplete_expired': 'Expirada',
      'past_due': 'Pagamento atrasado',
      'unpaid': 'Não paga'
    };
    return statuses[status.toLowerCase()] || status;
  },

  /**
   * Verificar se subscrição está ativa
   */
  isActive: (status: string): boolean => {
    return ['active', 'trialing'].includes(status.toLowerCase());
  },

  /**
   * Calcular dias restantes até renovação
   */
  daysUntilRenewal: (periodEnd?: string): number | null => {
    if (!periodEnd) return null;
    
    const end = new Date(periodEnd);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  }
};

logger.info('Subscription Service carregado', 'SUBSCRIPTION');
