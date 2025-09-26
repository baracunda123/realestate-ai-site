// useSignalR.ts - Hook para gestão da conexão SignalR
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import signalRService, { type SignalRNotification } from '../services/signalr.service';
import apiClient from '../api/client';

interface UseSignalRReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: string;
  unreadCount: number;
  notifications: SignalRNotification[];
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  acknowledgeNotification: (notificationId: string) => Promise<void>;
  clearNotifications: () => void;
}

/**
 * Hook para gestão da conexão SignalR e notificações em tempo real
 */
export function useSignalR(): UseSignalRReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState('Disconnected');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<SignalRNotification[]>([]);
  
  const mountedRef = useRef(true);
  const hasShownConnectionToast = useRef(false);

  // Função para conectar
  const connect = useCallback(async () => {
    if (!apiClient.isAuthenticated()) {
      console.log('?? Utilizador não autenticado, não conectando SignalR');
      return;
    }

    if (isConnecting || isConnected) {
      console.log('?? SignalR já está conectado ou conectando');
      return;
    }

    try {
      setIsConnecting(true);
      
      const token = apiClient.getToken();
      if (!token) {
        throw new Error('Token de autenticação não encontrado');
      }

      const success = await signalRService.initialize(token);
      
      if (mountedRef.current) {
        setIsConnecting(false);
        
        if (success) {
          setIsConnected(true);
          setConnectionState('Connected');
          
          // Mostrar toast apenas uma vez por sessão
          if (!hasShownConnectionToast.current) {
            toast.success('?? Notificações em tempo real ativadas!', {
              description: 'Receberá alertas de redução de preço instantaneamente',
              duration: 3000
            });
            hasShownConnectionToast.current = true;
          }
        }
      }
    } catch (error) {
      console.error('? Erro ao conectar SignalR:', error);
      
      if (mountedRef.current) {
        setIsConnecting(false);
        setIsConnected(false);
        setConnectionState('Disconnected');
      }
    }
  }, [isConnecting, isConnected]);

  // Função para desconectar
  const disconnect = useCallback(async () => {
    try {
      await signalRService.disconnect();
      
      if (mountedRef.current) {
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionState('Disconnected');
        hasShownConnectionToast.current = false;
      }
    } catch (error) {
      console.error('? Erro ao desconectar SignalR:', error);
    }
  }, []);

  // Função para confirmar notificação
  const acknowledgeNotification = useCallback(async (notificationId: string) => {
    try {
      await signalRService.acknowledgeNotification(notificationId);
    } catch (error) {
      console.error('? Erro ao confirmar notificação:', error);
    }
  }, []);

  // Função para limpar notificações locais
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Configurar event listeners do SignalR
  useEffect(() => {
    if (!mountedRef.current) return;

    // Handler para nova notificação de preço
    const handleNewPriceAlert = (data: SignalRNotification) => {
      if (!mountedRef.current) return;
      
      console.log('?? Nova notificação de preço:', data);
      
      setNotifications(prev => [data, ...prev.slice(0, 19)]); // Manter apenas 20 mais recentes
      setUnreadCount(prev => prev + 1);
      
      // Mostrar toast
      toast.success(data.message || '?? Redução de preço detectada!', {
        description: 'Clique para ver detalhes',
        duration: 5000,
        action: {
          label: 'Ver',
          onClick: () => {
            // Redirecionar para área pessoal ou mostrar detalhes
            console.log('Abrir detalhes da notificação:', data);
          }
        }
      });
    };

    // Handler para alerta criado
    const handleAlertCreated = (data: SignalRNotification) => {
      if (!mountedRef.current) return;
      
      console.log('?? Alerta criado:', data);
      
      setNotifications(prev => [data, ...prev.slice(0, 19)]);
      
      // Toast mais suave para criação de alerta
      toast.info(data.message || '?? Alerta de preço criado!', {
        description: 'Será notificado de reduções de preço',
        duration: 3000
      });
    };

    // Handler para atualização da contagem
    const handleUnreadCountUpdate = (data: SignalRNotification) => {
      if (!mountedRef.current) return;
      
      console.log('?? Contagem atualizada:', data.unreadCount);
      
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    };

    // Handler para reconexão
    const handleReconnected = (data: any) => {
      if (!mountedRef.current) return;
      
      console.log('? SignalR reconectado:', data);
      setIsConnected(true);
      setConnectionState('Connected');
      
      toast.success('?? Conexão restaurada!', {
        description: 'Notificações em tempo real reativadas',
        duration: 2000
      });
    };

    // Handler para desconexão
    const handleClosed = (data: any) => {
      if (!mountedRef.current) return;
      
      console.log('? SignalR desconectado:', data);
      setIsConnected(false);
      setConnectionState('Disconnected');
      
      if (data.error) {
        toast.warning('?? Conexão perdida', {
          description: 'Tentando reconectar automaticamente...',
          duration: 3000
        });
      }
    };

    // Handler para tentativa de reconexão
    const handleReconnecting = (data: any) => {
      if (!mountedRef.current) return;
      
      console.log('?? SignalR tentando reconectar:', data);
      setConnectionState('Reconnecting');
    };

    // Registrar event listeners
    signalRService.on('newPriceAlert', handleNewPriceAlert);
    signalRService.on('alertCreated', handleAlertCreated);
    signalRService.on('unreadCountUpdate', handleUnreadCountUpdate);
    signalRService.on('reconnected', handleReconnected);
    signalRService.on('closed', handleClosed);
    signalRService.on('reconnecting', handleReconnecting);

    // Cleanup
    return () => {
      signalRService.off('newPriceAlert', handleNewPriceAlert);
      signalRService.off('alertCreated', handleAlertCreated);
      signalRService.off('unreadCountUpdate', handleUnreadCountUpdate);
      signalRService.off('reconnected', handleReconnected);
      signalRService.off('closed', handleClosed);
      signalRService.off('reconnecting', handleReconnecting);
    };
  }, []);

  // Conectar automaticamente quando houver autenticação
  useEffect(() => {
    if (apiClient.isAuthenticated()) {
      connect();
    }

    // Cleanup no desmonte
    return () => {
      mountedRef.current = false;
      if (isConnected) {
        disconnect();
      }
    };
  }, [connect, disconnect, isConnected]);

  // Atualizar estado da conexão periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (mountedRef.current) {
        const currentState = signalRService.getConnectionState();
        const currentlyConnected = signalRService.isConnected();
        
        setConnectionState(currentState);
        setIsConnected(currentlyConnected);
      }
    }, 5000); // Verificar a cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    isConnecting,
    connectionState,
    unreadCount,
    notifications,
    connect,
    disconnect,
    acknowledgeNotification,
    clearNotifications
  };
}

/**
 * Hook simplificado apenas para contagem de não lidas (substitui useUnreadNotificationsCount)
 */
export function useUnreadNotificationsCount(): {
  unreadCount: number;
  isLoading: boolean;
} {
  const { unreadCount, isConnected, isConnecting } = useSignalR();
  
  // Se o SignalR estiver conectado, usar a contagem em tempo real
  // Caso contrário, isLoading = true para indicar que não temos dados em tempo real
  return {
    unreadCount: isConnected ? unreadCount : 0,
    isLoading: isConnecting || !isConnected
  };
}