import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { PropertyAlertNotification } from '../types/PersonalArea';
import {
  getRecentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../api/alert-notifications.service';
import { useSignalR } from './useSignalR';
import { authUtils } from '../api/auth.service';
import { logger } from '../utils/logger';

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
    
    // ? VERIFICAR AUTENTICAÇÃO ANTES DE FAZER CHAMADA
    if (!authUtils.isAuthenticated()) {
      if (showLoading) setIsLoading(false);
      setNotifications([]);
      return;
    }
    
    if (showLoading) setIsLoading(true);
    
    try {
      const notificationsList = await getRecentNotifications(20);
      
      if (mountedRef.current) {
        setNotifications(notificationsList);
      }
    } catch (error) {
      logger.error('Erro ao carregar notificações', 'NOTIFICATIONS', error as Error);
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
    
    // ? VERIFICAR AUTENTICAÇÃO
    if (!authUtils.isAuthenticated()) {
      return;
    }
    
    setIsRefreshing(true);
    await loadNotifications(false);
    setIsRefreshing(false);
  }, [loadNotifications]);

  // Marcar como lida
  const markAsRead = useCallback(async (notificationId: string) => {
    // ? VERIFICAR AUTENTICAÇÃO
    if (!authUtils.isAuthenticated()) {
      return;
    }
    
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
      logger.error('Erro ao marcar como lida', 'NOTIFICATIONS', error as Error);
      toast.error('Erro ao marcar notificação como lida');
    }
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(async () => {
    // ? VERIFICAR AUTENTICAÇÃO
    if (!authUtils.isAuthenticated()) {
      return;
    }
    
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
      logger.error('Erro ao marcar todas como lidas', 'NOTIFICATIONS', error as Error);
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
    if (isConnected && authUtils.isAuthenticated()) {
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
 * ? APENAS CARREGA SE USUÁRIO ESTIVER AUTENTICADO
 */
export function useUnreadNotificationsCount(): {
  unreadCount: number;
  isLoading: boolean;
} {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false); // ? Não mostrar loading por padrão
  const mountedRef = useRef(true);

  // Carregar apenas a contagem
  useEffect(() => {
    // ? VERIFICAR AUTENTICAÇÃO ANTES DE FAZER QUALQUER CHAMADA
    if (!authUtils.isAuthenticated()) {
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    const loadUnreadCount = async () => {
      if (!mountedRef.current) return;
      
      setIsLoading(true);
      
      try {
        const notifications = await getRecentNotifications(50); // Carregar mais para ter contagem precisa
        if (mountedRef.current) {
          const count = notifications.filter(n => !n.isRead).length;
          setUnreadCount(count);
        }
      } catch (error) {
        logger.error('Erro ao carregar contagem de notificações', 'NOTIFICATIONS', error as Error);
        if (mountedRef.current) {
          setUnreadCount(0);
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadUnreadCount();

    // Polling a cada 30 segundos para atualizar contagem
    const interval = setInterval(() => {
      if (mountedRef.current && authUtils.isAuthenticated()) {
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