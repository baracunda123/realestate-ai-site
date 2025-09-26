import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { PropertyAlertNotification } from '../types/PersonalArea';
import {
  getRecentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../api/alert-notifications.service';
import { useSignalR } from './useSignalR';

interface UseNotificationsReturn {
  notifications: PropertyAlertNotification[];
  unreadCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Hook para gestão de notificações com SignalR (substitui o sistema de polling)
 */
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<PropertyAlertNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedRef = useRef(true);

  // Usar SignalR para notificações em tempo real
  const { 
    unreadCount, 
    isConnected, 
    notifications: signalRNotifications 
  } = useSignalR();

  // Carregar notificações iniciais
  const loadNotifications = useCallback(async (showLoading = true) => {
    if (!mountedRef.current) return;
    
    if (showLoading) setIsLoading(true);
    
    try {
      const notificationsList = await getRecentNotifications(20);
      
      if (mountedRef.current) {
        setNotifications(notificationsList);
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      if (mountedRef.current) {
        setNotifications([]);
      }
    } finally {
      if (mountedRef.current) {
        if (showLoading) setIsLoading(false);
      }
    }
  }, []);

  // Refresh manual
  const refresh = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setIsRefreshing(true);
    await loadNotifications(false);
    setIsRefreshing(false);
  }, [loadNotifications]);

  // Marcar como lida
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, isRead: true }
            : notif
        )
      );
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
      toast.error('Erro ao marcar notificação como lida');
    }
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          isRead: true
        }))
      );
      
      toast.success('Todas as notificações marcadas como lidas');
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      toast.error('Erro ao marcar todas as notificações como lidas');
    }
  }, []);

  // Carregar notificações iniciais
  useEffect(() => {
    mountedRef.current = true;
    loadNotifications();

    return () => {
      mountedRef.current = false;
    };
  }, [loadNotifications]);

  // Processar notificações do SignalR
  useEffect(() => {
    if (signalRNotifications.length > 0 && isConnected) {
      // Quando chegar nova notificação via SignalR, fazer refresh das notificações
      // para ter os dados mais atualizados da base de dados
      refresh();
    }
  }, [signalRNotifications, isConnected, refresh]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    markAsRead,
    markAllAsRead,
    refresh
  };
}

/**
 * Hook simplificado para apenas contagem de notificações não lidas
 * NOVA VERSÃO: Usa SignalR em vez de polling
 */
export function useUnreadNotificationsCount(): {
  unreadCount: number;
  isLoading: boolean;
} {
  const { unreadCount, isConnected, isConnecting } = useSignalR();
  
  return {
    unreadCount,
    isLoading: isConnecting || !isConnected
  };
}