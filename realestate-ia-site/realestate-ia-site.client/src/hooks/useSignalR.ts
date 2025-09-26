// useSignalR.ts - Hook para gest�o da conex�o SignalR
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import signalRService, { type SignalRNotification } from '../services/signalr.service';
import apiClient, { SecureTokenManager } from '../api/client';

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
 * Hook para gest�o da conex�o SignalR e notifica��es em tempo real
 */
export function useSignalR(): UseSignalRReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState('Disconnected');
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<SignalRNotification[]>([]);
  
  const mountedRef = useRef(true);
  const hasShownConnectionToast = useRef(false);

  // Fun��o para conectar
  const connect = useCallback(async () => {
    if (!apiClient.isAuthenticated()) {
      console.log('?? Utilizador n�o autenticado, n�o conectando SignalR');
      return;
    }

    if (isConnecting || isConnected) {
      console.log('?? SignalR j� est� conectado ou conectando');
      return;
    }

    try {
      setIsConnecting(true);
      
      const token = SecureTokenManager.getAccessToken();
      if (!token) {
        throw new Error('Token de autentica��o n�o encontrado');
      }

      const success = await signalRService.initialize(token);
      
      if (mountedRef.current) {
        setIsConnecting(false);
        
        if (success) {
          setIsConnected(true);
          setConnectionState('Connected');
          
          // Mostrar toast apenas uma vez por sess�o
          if (!hasShownConnectionToast.current) {
            toast.success('?? Notifica��es em tempo real ativadas!', {
              description: 'Receber� alertas de redu��o de pre�o instantaneamente',
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

  // Fun��o para desconectar
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

  // Fun��o para confirmar notifica��o
  const acknowledgeNotification = useCallback(async (notificationId: string) => {
    try {
      await signalRService.acknowledgeNotification(notificationId);
    } catch (error) {
      console.error('? Erro ao confirmar notifica��o:', error);
    }
  }, []);

  // Fun��o para limpar notifica��es locais
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Configurar event listeners do SignalR
  useEffect(() => {
    if (!mountedRef.current) return;

    // Handler para nova notifica��o de pre�o
    const handleNewPriceAlert = (data: SignalRNotification) => {
      if (!mountedRef.current) return;
      
      console.log('?? Nova notifica��o de pre�o:', data);
      
      setNotifications(prev => [data, ...prev.slice(0, 19)]); // Manter apenas 20 mais recentes
      setUnreadCount(prev => prev + 1);
      
      // Mostrar toast
      toast.success(data.message || '?? Redu��o de pre�o detectada!', {
        description: 'Clique para ver detalhes',
        duration: 5000,
        action: {
          label: 'Ver',
          onClick: () => {
            // Redirecionar para �rea pessoal ou mostrar detalhes
            console.log('Abrir detalhes da notifica��o:', data);
          }
        }
      });
    };

    // Handler para alerta criado
    const handleAlertCreated = (data: SignalRNotification) => {
      if (!mountedRef.current) return;
      
      console.log('?? Alerta criado:', data);
      
      setNotifications(prev => [data, ...prev.slice(0, 19)]);
      
      // Toast mais suave para cria��o de alerta
      toast.info(data.message || '?? Alerta de pre�o criado!', {
        description: 'Ser� notificado de redu��es de pre�o',
        duration: 3000
      });
    };

    // Handler para atualiza��o da contagem
    const handleUnreadCountUpdate = (data: SignalRNotification) => {
      if (!mountedRef.current) return;
      
      console.log('?? Contagem atualizada:', data.unreadCount);
      
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    };

    // Handler para reconex�o
    const handleReconnected = (data: any) => {
      if (!mountedRef.current) return;
      
      console.log('? SignalR reconectado:', data);
      setIsConnected(true);
      setConnectionState('Connected');
      
      toast.success('?? Conex�o restaurada!', {
        description: 'Notifica��es em tempo real reativadas',
        duration: 2000
      });
    };

    // Handler para desconex�o
    const handleClosed = (data: any) => {
      if (!mountedRef.current) return;
      
      console.log('? SignalR desconectado:', data);
      setIsConnected(false);
      setConnectionState('Disconnected');
      
      if (data.error) {
        toast.warning('?? Conex�o perdida', {
          description: 'Tentando reconectar automaticamente...',
          duration: 3000
        });
      }
    };

    // Handler para tentativa de reconex�o
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

  // Conectar automaticamente quando houver autentica��o
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

  // Atualizar estado da conex�o periodicamente
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
 * Hook simplificado apenas para contagem de n�o lidas (substitui useUnreadNotificationsCount)
 */
export function useUnreadNotificationsCount(): {
  unreadCount: number;
  isLoading: boolean;
} {
  const { unreadCount, isConnected, isConnecting } = useSignalR();
  
  // Se o SignalR estiver conectado, usar a contagem em tempo real
  // Caso contr�rio, isLoading = true para indicar que n�o temos dados em tempo real
  return {
    unreadCount: isConnected ? unreadCount : 0,
    isLoading: isConnecting || !isConnected
  };
}