import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { PropertyAlertNotification } from '../types/PersonalArea';
import {
  getRecentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../api/alert-notifications.service';
import apiClient from '../api/client';

interface UseNotificationsReturn {
  notifications: PropertyAlertNotification[];
  unreadCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Hook para gestão de notificações com refresh automático
 */
export function useNotifications(pollingInterval: number = 30000): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<PropertyAlertNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Calcular notificações não lidas
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Carregar notificações
  const loadNotifications = useCallback(async (showLoading = true) => {
    if (!mountedRef.current) return;
    
    if (showLoading) setIsLoading(true);
    
    try {
      const notificationsList = await getRecentNotifications(10); // Buscar mais notificações
      
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

  // Iniciar polling
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    pollingRef.current = setInterval(() => {
      if (mountedRef.current) {
        loadNotifications(false);
      }
    }, pollingInterval);
  }, [loadNotifications, pollingInterval]);

  // Parar polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Ref para controlar toast notifications - FORA do useEffect
  const previousUnreadRef = useRef(0);

  // Verificar se há novas notificações e mostrar toast
  useEffect(() => {
    if (!isLoading && notifications.length > 0) {
      const currentUnread = unreadCount;
      
      // Se há mais notificações não lidas que antes (exceto no primeiro load)
      if (previousUnreadRef.current > 0 && currentUnread > previousUnreadRef.current) {
        const newNotifications = currentUnread - previousUnreadRef.current;
        toast.success(`${newNotifications} nova${newNotifications > 1 ? 's' : ''} notificação${newNotifications > 1 ? 'ões' : ''}!`, {
          description: 'Verifique o dashboard para mais detalhes',
          duration: 5000,
        });
      }
      
      previousUnreadRef.current = currentUnread;
    }
  }, [notifications, unreadCount, isLoading]);

  // Carregar inicial e iniciar polling
  useEffect(() => {
    mountedRef.current = true;
    loadNotifications();
    startPolling();

    // Cleanup
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [loadNotifications, startPolling, stopPolling]);

  // Parar polling quando a aba não está ativa (otimização)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startPolling();
        // Refresh quando voltar à aba
        refresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startPolling, stopPolling, refresh]);

  return {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    markAsRead,
    markAllAsRead,
    refresh,
    startPolling,
    stopPolling
  };
}

/**
 * Hook simplificado para apenas contagem de notificações não lidas
 * SEMPRE executa para evitar "Rules of Hooks" violation mas não faz requests se não autenticado
 */
export function useUnreadNotificationsCount(pollingInterval: number = 60000): {
  unreadCount: number;
  isLoading: boolean;
} {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const checkUnreadCount = useCallback(async () => {
    if (!mountedRef.current) return;
    
    // Verificar autenticação usando o apiClient
    if (!apiClient.isAuthenticated()) {
      if (mountedRef.current) {
        setUnreadCount(0);
        setIsLoading(false);
      }
      return;
    }
    
    try {
      const notifications = await getRecentNotifications(50);
      const count = notifications.filter(n => !n.isRead).length;
      
      if (mountedRef.current) {
        setUnreadCount(count);
        setIsLoading(false);
      }
    } catch (error) {
      // Falha silenciosa - pode ser usuário não autenticado ou erro de rede
      if (mountedRef.current) {
        setUnreadCount(0);
        setIsLoading(false);
      }
    }
  }, []);

  // Inicializar ref na primeira renderização
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Setup do polling
  useEffect(() => {
    // Verificação inicial
    checkUnreadCount();
    
    // Configurar polling
    pollingRef.current = setInterval(() => {
      if (mountedRef.current) {
        checkUnreadCount();
      }
    }, pollingInterval);

    // Cleanup
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [checkUnreadCount, pollingInterval]);

  return {
    unreadCount,
    isLoading
  };
}