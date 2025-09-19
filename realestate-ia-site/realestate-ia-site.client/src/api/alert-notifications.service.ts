// alert-notifications.service.ts - Serviço para notificações de alertas
import apiClient from "./client";

// Response types para notificações de alertas
export interface PropertyAlertNotification {
  id: string;
  userId: string;
  propertyId: string;
  alertId: string;
  alertType: string;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
  isActive: boolean;
  propertyPrice?: number;
  oldPrice?: number;
  propertyLocation?: string;
}

export interface AlertNotificationsResponse {
  notifications: PropertyAlertNotification[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
}

export interface AlertNotificationStats {
  totalNotifications: number;
  unreadNotifications: number;
  todayNotifications: number;
  weekNotifications: number;
  byAlertType: Record<string, number>;
  lastNotification?: string;
}

// Função simples para logs
function logToTerminal(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = level === 'error' ? '?' : level === 'warn' ? '??' : '?';
  console.log(`${prefix} [${timestamp}] ALERT_NOTIFICATIONS: ${message}`);
}

/**
 * Obter notificações de alertas do usuário
 */
export async function getAlertNotifications(
  page: number = 1,
  pageSize: number = 20,
  unreadOnly: boolean = false
): Promise<AlertNotificationsResponse> {
  logToTerminal(`Buscando notificações (página ${page}, unreadOnly: ${unreadOnly})`);

  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('pageSize', pageSize.toString());
  if (unreadOnly) params.append('unreadOnly', 'true');

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
  markedCount: number;
}> {
  logToTerminal('Marcando todas as notificações como lidas');

  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      markedCount: number;
    }>('/api/alerts/notifications/mark-all-read');
    
    logToTerminal(`${response.markedCount} notificações marcadas como lidas`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao marcar todas as notificações como lidas: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Excluir notificação
 */
export async function deleteNotification(
  notificationId: string
): Promise<{ success: boolean; message: string }> {
  logToTerminal(`Excluindo notificação: ${notificationId}`);

  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/alerts/notifications/${notificationId}`
    );
    
    logToTerminal(`Notificação excluída`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao excluir notificação: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Obter estatísticas das notificações de alertas
 */
export async function getAlertNotificationStats(): Promise<AlertNotificationStats> {
  logToTerminal('Buscando estatísticas das notificações');

  try {
    const stats = await apiClient.get<AlertNotificationStats>('/api/alerts/notifications/stats');
    
    logToTerminal(`Estatísticas: ${stats.unreadNotifications} não lidas, ${stats.todayNotifications} hoje`);
    return stats;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao buscar estatísticas das notificações: ${errorMsg}`, 'error');
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
    const response = await apiClient.get<{ notifications: PropertyAlertNotification[] }>(
      `/api/alerts/notifications/recent?limit=${limit}`
    );
    
    logToTerminal(`${response.notifications?.length || 0} notificações recentes encontradas`);
    return response.notifications || [];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao buscar notificações recentes: ${errorMsg}`, 'error');
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
      'new_listing': 'Nova Propriedade',
      'price_drop': 'Redução de Preço',
      'price_increase': 'Aumento de Preço',
      'back_to_market': 'Voltou ao Mercado',
      'status_change': 'Mudança de Status'
    };
    return types[alertType] || alertType;
  },

  /**
   * Obter ícone baseado no tipo de alerta
   */
  getAlertTypeIcon: (alertType: string): string => {
    const icons: Record<string, string> = {
      'new_listing': '??',
      'price_drop': '??',
      'price_increase': '??',
      'back_to_market': '??',
      'status_change': '??'
    };
    return icons[alertType] || '??';
  },

  /**
   * Obter cor baseada no tipo de alerta
   */
  getAlertTypeColor: (alertType: string): string => {
    const colors: Record<string, string> = {
      'new_listing': 'text-blue-600',
      'price_drop': 'text-green-600',
      'price_increase': 'text-red-600',
      'back_to_market': 'text-purple-600',
      'status_change': 'text-orange-600'
    };
    return colors[alertType] || 'text-gray-600';
  },

  /**
   * Verificar se a notificação é recente (menos de 1 hora)
   */
  isRecent: (createdAt: string): boolean => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMinutes = (now.getTime() - created.getTime()) / (1000 * 60);
    return diffMinutes < 60;
  },

  /**
   * Verificar se a notificação é de hoje
   */
  isToday: (createdAt: string): boolean => {
    const created = new Date(createdAt);
    const now = new Date();
    return created.toDateString() === now.toDateString();
  },

  /**
   * Formatar tempo relativo
   */
  formatRelativeTime: (createdAt: string): string => {
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
    
    const difference = currentPrice - oldPrice;
    const percentage = ((difference / oldPrice) * 100).toFixed(1);
    
    if (difference > 0) {
      return `+€${difference.toLocaleString()} (+${percentage}%)`;
    } else {
      return `-€${Math.abs(difference).toLocaleString()} (${percentage}%)`;
    }
  }
};

// Log apenas quando carrega em desenvolvimento
try {
  if (process.env.NODE_ENV === 'development') {
    logToTerminal('Alert Notifications Service carregado');
  }
} catch {
  // Ignorar se verificação de ambiente falhar
}