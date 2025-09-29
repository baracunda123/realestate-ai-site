// alert-notifications.service.ts - Serviço para notificações de alertas
import apiClient from "./client";
import { alertNotifications as logger } from "../utils/logger";
import type { PropertyAlertNotification } from "../types/PersonalArea";
import { getNotifications } from "./alerts.service";

/**
 * Obter notificações de alertas do usuário
 */
export async function getAlertNotifications(limit: number = 20) {
  return await getNotifications(limit);
}

/**
 * Obter notificações recentes para o dashboard
 */
export async function getRecentNotifications(
  limit: number = 5
): Promise<PropertyAlertNotification[]> {
  logger.info(`Buscando notificações recentes (limite: ${limit})`);

  try {
    const response = await getNotifications(limit);
    
    logger.info(`${response.notifications?.length || 0} notificações recentes encontradas`);
    return response.notifications || [];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao buscar notificações recentes: ${errorMsg}`);
    return []; // Retorna array vazio em caso de erro
  }
}

/**
 * Marcar notificação como lida
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; message: string }> {
  logger.info(`Marcando notificação como lida: ${notificationId}`);

  try {
    const response = await apiClient.post<{ message: string }>(
      `/api/alerts/notifications/${notificationId}/mark-read`
    );
    
    logger.info(`Notificação marcada como lida`);
    return { success: true, message: response.message };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao marcar notificação como lida: ${errorMsg}`);
    throw error;
  }
}

/**
 * Marcar todas as notificações como lidas
 */
export async function markAllNotificationsAsRead(): Promise<{
  success: boolean;
  message: string;
}> {
  logger.info('Marcando todas as notificações como lidas');

  try {
    const response = await apiClient.post<{ message: string }>(
      '/api/alerts/notifications/mark-all-read'
    );
    
    logger.info(`Todas as notificações marcadas como lidas`);
    return { success: true, message: response.message };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao marcar todas as notificações como lidas: ${errorMsg}`);
    throw error;
  }
}

// Utils para notificações de alertas
export const alertNotificationUtils = {
  /**
   * Formatar tipo de alerta
   */
  formatAlertType: (alertType: string): string => {
    const types: Record<string, string> = {
      'price_drop': 'Redução de Preço'
    };
    return types[alertType] || alertType;
  },

  /**
   * Obter ícone baseado no tipo de alerta
   */
  getAlertTypeIcon: (alertType: string): string => {
    const icons: Record<string, string> = {
      'price_drop': '💰'
    };
    return icons[alertType] || '🔔';
  },

  /**
   * Obter cor baseada no tipo de alerta
   */
  getAlertTypeColor: (alertType: string): string => {
    const colors: Record<string, string> = {
      'price_drop': 'text-green-600'
    };
    return colors[alertType] || 'text-gray-600';
  },

  /**
   * Verificar se a notificação é recente (menos de 1 hora)
   */
  isRecent: (createdAt: string | Date): boolean => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
    return diffMinutes < 60;
  },

  /**
   * Verificar se a notificação é de hoje
   */
  isToday: (createdAt: string | Date): boolean => {
    const created = new Date(createdAt);
    const now = new Date();
    return created.toDateString() === now.toDateString();
  },

  /**
   * Formatar tempo relativo
   */
  formatRelativeTime: (createdAt: string | Date): string => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Agora mesmo';
    if (diffMinutes < 60) return `${diffMinutes}min atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return created.toLocaleDateString('pt-PT');
  },

  /**
   * Formatar mensagem de mudança de preço
   */
  formatPriceChange: (currentPrice?: number, oldPrice?: number): string => {
    if (!currentPrice || !oldPrice) return '';
    
    const difference = oldPrice - currentPrice; // Diferença positiva para descidas
    const percentage = ((difference / oldPrice) * 100).toFixed(1);
    
    if (difference > 0) {
      return `Poupança de €${difference.toLocaleString('pt-PT')} (-${percentage}%)`;
    }
    
    return '';
  }
};

// Log apenas quando carrega em desenvolvimento
logger.info('Alert Notifications Service carregado (simplificado)');