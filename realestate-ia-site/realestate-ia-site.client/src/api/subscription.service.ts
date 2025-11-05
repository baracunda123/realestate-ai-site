import apiClient from './client';
import { logger } from '../utils/logger';

// Request types
export interface CreateSubscriptionRequest {
  planId: string;
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
export async function createSubscription(planId: string): Promise<SubscriptionResult> {
  logger.info(`Criando subscrição com planId: ${planId}`, 'SUBSCRIPTION');
  
  try {
    const response = await apiClient.post<SubscriptionResult>(
      '/api/subscription/create',
      { planId }
    );
    
    logger.info('Subscrição criada com sucesso', 'SUBSCRIPTION');
    return response;
  } catch (error: any) {
    logger.error('Erro ao criar subscrição', 'SUBSCRIPTION', error);
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
  } catch (error: any) {
    logger.error('Erro ao atualizar subscrição', 'SUBSCRIPTION', error);
    throw error;
  }
}

/**
 * Cancelar subscrição
 */
export async function cancelSubscription(request?: CancelSubscriptionRequest): Promise<SubscriptionResult> {
  logger.info('Cancelando subscrição', 'SUBSCRIPTION');
  
  try {
    const response = await apiClient.post<SubscriptionResult>(
      '/api/subscription/cancel',
      request || {}
    );
    
    logger.info('Subscrição cancelada com sucesso', 'SUBSCRIPTION');
    return response;
  } catch (error: any) {
    logger.error('Erro ao cancelar subscrição', 'SUBSCRIPTION', error);
    throw error;
  }
}

/**
 * Obter subscrição ativa atual
 */
export async function getCurrentSubscription(): Promise<SubscriptionDto | null> {
  logger.info('Obtendo subscrição atual', 'SUBSCRIPTION');
  
  try {
    const response = await apiClient.get<SubscriptionDto | null>('/api/subscription/current');
    return response;
  } catch (error: any) {
    logger.error('Erro ao obter subscrição atual', 'SUBSCRIPTION', error);
    throw error;
  }
}

/**
 * Obter histórico de subscrições
 */
export async function getSubscriptionHistory(): Promise<SubscriptionDto[]> {
  logger.info('Obtendo histórico de subscrições', 'SUBSCRIPTION');
  
  try {
    const response = await apiClient.get<SubscriptionDto[]>('/api/subscription/history');
    return response;
  } catch (error: any) {
    logger.error('Erro ao obter histórico de subscrições', 'SUBSCRIPTION', error);
    throw error;
  }
}

/**
 * Verificar se tem subscrição ativa
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  logger.info('Verificando status de subscrição', 'SUBSCRIPTION');
  
  try {
    const response = await apiClient.get<SubscriptionStatus>('/api/subscription/status');
    return response;
  } catch (error: any) {
    logger.error('Erro ao verificar status de subscrição', 'SUBSCRIPTION', error);
    throw error;
  }
}
