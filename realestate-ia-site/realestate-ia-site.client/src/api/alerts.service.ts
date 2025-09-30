// alerts.service.ts - Serviço para alertas de redução de preço
import apiClient from "./client";
import { priceAlerts as logger } from "../utils/logger";
import type { 
  PropertyAlert, 
  CreatePriceAlertRequest, 
  UpdatePriceAlertRequest,
  AlertsResponse,
  AlertNotificationsResponse
} from "../types/PersonalArea";

/**
 * Obter todos os alertas de redução de preço do usuário
 */
export async function getUserAlerts(
  includeInactive: boolean = false
): Promise<AlertsResponse> {
  logger.info(`Buscando alertas de preço (incluir inativos: ${includeInactive})`);

  const params = new URLSearchParams();
  if (includeInactive) params.append('includeInactive', 'true');

  try {
    const response = await apiClient.get<AlertsResponse>(`/api/alerts?${params.toString()}`);
    
    logger.info(`${response.alerts?.length || 0} alertas encontrados (${response.activeCount} ativos)`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao buscar alertas: ${errorMsg}`);
    throw error;
  }
}

/**
 * Obter detalhes de um alerta específico
 */
export async function getAlertById(alertId: string): Promise<PropertyAlert> {
  logger.info(`Buscando alerta: ${alertId}`);

  try {
    const alert = await apiClient.get<PropertyAlert>(`/api/alerts/${alertId}`);
    
    logger.info(`Alerta encontrado: ${alert.propertyTitle}`);
    return alert;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao buscar alerta ${alertId}: ${errorMsg}`);
    throw error;
  }
}

/**
 * Criar novo alerta de redução de preço
 */
export async function createPriceAlert(alertData: CreatePriceAlertRequest): Promise<PropertyAlert> {
  logger.info(`Criando alerta de preço para propriedade: ${alertData.propertyId}`);

  try {
    const alert = await apiClient.post<PropertyAlert>('/api/alerts', alertData);
    
    logger.info(`Alerta de preço criado: ${alert.id}`);
    return alert;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao criar alerta: ${errorMsg}`);
    throw error;
  }
}

/**
 * Atualizar alerta existente
 */
export async function updateAlert(
  alertId: string,
  updates: UpdatePriceAlertRequest
): Promise<PropertyAlert> {
  logger.info(`Atualizando alerta: ${alertId}`);

  try {
    const alert = await apiClient.put<PropertyAlert>(`/api/alerts/${alertId}`, updates);
    
    logger.info(`Alerta atualizado: ${alert.id}`);
    return alert;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao atualizar alerta: ${errorMsg}`);
    throw error;
  }
}

/**
 * Excluir alerta
 */
export async function deleteAlert(alertId: string): Promise<{ success: boolean; message: string }> {
  logger.info(`Excluindo alerta: ${alertId}`);

  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/alerts/${alertId}`
    );
    
    logger.info(`Alerta excluído`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao excluir alerta: ${errorMsg}`);
    throw error;
  }
}

/**
 * Excluir alerta por propriedade
 */
export async function deleteAlertByProperty(propertyId: string): Promise<{ success: boolean; message: string }> {
  logger.info(`Excluindo alerta para propriedade: ${propertyId}`);

  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/alerts/property/${propertyId}`
    );
    
    logger.info(`Alerta excluído para propriedade`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao excluir alerta da propriedade: ${errorMsg}`);
    throw error;
  }
}

/**
 * Verificar se existe alerta para uma propriedade
 */
export async function hasAlertForProperty(propertyId: string): Promise<boolean> {
  logger.info(`Verificando alerta para propriedade: ${propertyId}`);

  try {
    const hasAlert = await apiClient.get<boolean>(`/api/alerts/property/${propertyId}/exists`);
    
    logger.info(`Propriedade ${hasAlert ? 'tem' : 'não tem'} alerta`);
    return hasAlert;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao verificar alerta: ${errorMsg}`);
    return false; // Retorna false em caso de erro
  }
}

/**
 * Obter notificações de redução de preço
 */
export async function getNotifications(limit: number = 20): Promise<AlertNotificationsResponse> {
  logger.info(`Buscando notificações de preço (limite: ${limit})`);

  try {
    const response = await apiClient.get<AlertNotificationsResponse>(
      `/api/alerts/notifications?limit=${limit}`
    );
    
    logger.info(`${response.notifications?.length || 0} notificações encontradas (${response.unreadCount} não lidas)`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao buscar notificações: ${errorMsg}`);
    throw error;
  }
}

// Utils para alertas de preço
export const priceAlertUtils = {
  /**
   * Formatar limiar de alerta
   */
  formatThreshold: (alert: PropertyAlert): string => {
    return `${alert.alertThresholdPercentage}% ou mais de redução`;
  },

  /**
   * Formatar informações do alerta
   */
  formatAlertInfo: (alert: PropertyAlert): string => {
    const parts = [];
    
    parts.push(`📍 ${alert.propertyLocation}`);
    parts.push(`💰 €${alert.currentPrice.toLocaleString('pt-PT')}`);
    parts.push(`Alerta: ${alert.alertThresholdPercentage}%`);
    
    return parts.join(' • ');
  },

  /**
   * Verificar se alerta tem notificações recentes
   */
  hasRecentActivity: (alert: PropertyAlert): boolean => {
    if (!alert.lastTriggered) return false;
    const hoursSinceTriggered = (Date.now() - new Date(alert.lastTriggered).getTime()) / (1000 * 60 * 60);
    return hoursSinceTriggered < 24;
  },

  /**
   * Obter status do alerta
   */
  getAlertStatus: (alert: PropertyAlert): 'active' | 'inactive' | 'triggered' => {
    if (!alert.isActive) return 'inactive';
    if (alert.notificationCount > 0) return 'triggered';
    return 'active';
  },

  /**
   * Formatar última atividade
   */
  formatLastActivity: (alert: PropertyAlert): string => {
    if (!alert.lastTriggered) return 'Nunca disparado';
    
    const date = new Date(alert.lastTriggered);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Disparado recentemente';
    if (diffHours < 24) return `Disparado há ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Disparado há ${diffDays}d`;
    
    return `Disparado em ${date.toLocaleDateString('pt-PT')}`;
  }
};

logger.info('Price Alerts Service carregado');