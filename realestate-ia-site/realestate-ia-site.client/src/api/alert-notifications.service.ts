// alert-notifications.service.ts - Serviço para notificações de alertas
import apiClient from "./client";
import type { PropertyAlertNotification, AlertNotificationsResponse, AlertType } from "../types/PersonalArea";

// Função simples para logs
function logToTerminal(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '🔔';
  console.log(`${prefix} [${timestamp}] ALERT_NOTIFICATIONS: ${message}`);
}

/**
 * Obter notificações de alertas do usuário
 */
export async function getAlertNotifications(
  limit: number = 20
): Promise<AlertNotificationsResponse> {
  logToTerminal(`Buscando notificações (limite: ${limit})`);

  const params = new URLSearchParams();
  params.append('limit', limit.toString());

  try {
    const response = await apiClient.get<AlertNotificationsResponse>(
      `/api/alerts/notifications?${params.toString()}`
    );
    
    logToTerminal(`${response.notifications?.length || 0} notificações encontradas (${response.unreadCount} não lidas)`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao buscar notificações: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Obter notificações recentes para o dashboard
 */
export async function getRecentNotifications(
  limit: number = 5
): Promise<PropertyAlertNotification[]> {
  logToTerminal(`Buscando notificações recentes (limite: ${limit})`);

  try {
    const response = await getAlertNotifications(limit);
    
    logToTerminal(`${response.notifications?.length || 0} notificações recentes encontradas`);
    return response.notifications || [];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao buscar notificações recentes: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Marcar notificação como lida
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; message: string }> {
  logToTerminal(`Marcando notificação como lida: ${notificationId}`);

  try {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/api/alerts/notifications/${notificationId}/mark-read`
    );
    
    logToTerminal(`Notificação marcada como lida`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao marcar notificação como lida: ${errorMsg}`, 'error');
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
  logToTerminal('Marcando todas as notificações como lidas');

  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>('/api/alerts/notifications/mark-all-read');
    
    logToTerminal(`Todas as notificações marcadas como lidas`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao marcar todas as notificações como lidas: ${errorMsg}`, 'error');
    throw error;
  }
}

// Utils para notificações de alertas (simplificados - usar AlertTypeUtils)
export const alertNotificationUtils = {
  /**
   * Formatar tipo de alerta
   */
  formatAlertType: (alertType: AlertType): string => {
    const types: Record<AlertType, string> = {
      'new_listing': 'Nova Propriedade',
      'price_drop': 'Redução de Preço',
      'back_to_market': 'Voltou ao Mercado',
      'status_change': 'Mudança de Status'
    };
    return types[alertType] || alertType;
  },

  /**
   * Obter ícone baseado no tipo de alerta
   */
  getAlertTypeIcon: (alertType: AlertType): string => {
    const icons: Record<AlertType, string> = {
      'new_listing': '🏠',
      'price_drop': '💰',
      'back_to_market': '🔄',
      'status_change': '📋'
    };
    return icons[alertType] || '🔔';
  },

  /**
   * Obter cor baseada no tipo de alerta
   */
  getAlertTypeColor: (alertType: AlertType): string => {
    const colors: Record<AlertType, string> = {
      'new_listing': 'text-blue-600',
      'price_drop': 'text-green-600',
      'back_to_market': 'text-purple-600',
      'status_change': 'text-orange-600'
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
      return `Poupança de €${difference.toLocaleString()} (-${percentage}%)`;
    } else {
      const increase = Math.abs(difference);
      return `Aumento de €${increase.toLocaleString()} (+${Math.abs(parseFloat(percentage))}%)`;
    }
  }
};

// Log apenas quando carrega em desenvolvimento

if (import.meta.env?.DEV) {
logToTerminal('Alert Notifications Service carregado (tipado)');
}