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
 * Hook para gestão de notificações com SignalR
 */
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<PropertyAlertNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedRef = useRef(true);

  // Usar SignalR para notificações em tempo real
  const { isConnected } = useSignalR({
    autoConnect: false,
    showToasts: true
  });

  // Calcular unreadCount localmente a partir das notificações
  useEffect(() => {
    const count = notifications.filter(n => !n.isRead).length;
    setUnreadCount(count);
  }, [notifications]);

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

  // Refresh quando SignalR conecta (indica que pode haver novas notificações)
  useEffect(() => {
    if (isConnected) {
      // Pequeno delay para dar tempo ao backend processar
      const timeoutId = setTimeout(() => {
        if (mountedRef.current) {
          refresh();
        }
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, refresh]);

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
 * Usa as notificações carregadas para calcular o unreadCount
 */
export function useUnreadNotificationsCount(): {
  unreadCount: number;
  isLoading: boolean;
} {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  // Carregar apenas a contagem
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!mountedRef.current) return;
      
      try {
        const notifications = await getRecentNotifications(50); // Carregar mais para ter contagem precisa
        if (mountedRef.current) {
          const count = notifications.filter(n => !n.isRead).length;
          setUnreadCount(count);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Erro ao carregar contagem de notificações:', error);
        if (mountedRef.current) {
          setUnreadCount(0);
          setIsLoading(false);
        }
      }
    };

    loadUnreadCount();

    // Polling a cada 30 segundos para atualizar contagem
    const interval = setInterval(() => {
      if (mountedRef.current) {
        loadUnreadCount();
      }
    }, 30000);

    return () => {
      clearInterval(interval);
      mountedRef.current = false;
    };
  }, []);
  
  return {
    unreadCount,
    isLoading
  };
}