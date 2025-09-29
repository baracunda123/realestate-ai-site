// useSignalR.ts - Hook para gestão da conexão SignalR
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import signalRService from '../api/signalr.service';
import { signalr as logger } from '../utils/logger';
import type { 
  PropertyAlertNotification,
  PriceChangeNotification,
  SystemNotification
} from '../api/signalr.service';
import { authUtils } from '../api/auth.service';

interface UseSignalROptions {
  autoConnect?: boolean;
  showToasts?: boolean;
}

interface UseSignalRReturn {
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: string;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  acknowledgeNotification: (notificationId: string) => Promise<void>;
  requestUnreadNotifications: () => Promise<void>;
  requestConnectionInfo: () => Promise<void>;
}

/**
 * Hook para gestão da conexão SignalR e notificações em tempo real
 */
export function useSignalR(options: UseSignalROptions = {}): UseSignalRReturn {
  const { showToasts = true } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionState, setConnectionState] = useState('Disconnected');
  
  const mountedRef = useRef(true);
  const hasConnectedRef = useRef(false);

  // Função para conectar
  const connect = useCallback(async (): Promise<boolean> => {
    if (!authUtils.isAuthenticated()) {
      return false;
    }

    if (isConnecting || isConnected) {
      return isConnected;
    }

    setIsConnecting(true);
    
    try {
      const success = await signalRService.connect();
      
      if (mountedRef.current) {
        setIsConnecting(false);
        setIsConnected(success);
        setConnectionState(signalRService.connectionState);
        
        if (success) {
          hasConnectedRef.current = true;
        }
      }
      
      return success;
    } catch (error) {
      logger.error('Erro na conexão', error as Error);
      
      if (mountedRef.current) {
        setIsConnecting(false);
        setIsConnected(false);
        setConnectionState('Disconnected');
      }
      
      return false;
    }
  }, [isConnecting, isConnected]);

  // Função para desconectar
  const disconnect = useCallback(async () => {
    logger.info('Desconectando...');
    
    try {
      await signalRService.disconnect();
      
      if (mountedRef.current) {
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionState('Disconnected');
        hasConnectedRef.current = false;
      }
      
      logger.info('Desconectado com sucesso');
    } catch (error) {
      logger.error('Erro na desconexão', error as Error);
    }
  }, []);

  // Wrapper methods para facilitar uso
  const acknowledgeNotification = useCallback(async (notificationId: string) => {
    try {
      await signalRService.acknowledgeNotification(notificationId);
    } catch (error) {
      logger.error('Erro ao confirmar notificação', error as Error);
    }
  }, []);

  const requestUnreadNotifications = useCallback(async () => {
    try {
      await signalRService.requestUnreadNotifications();
    } catch (error) {
      logger.error('Erro ao solicitar não lidas', error as Error);
    }
  }, []);

  const requestConnectionInfo = useCallback(async () => {
    try {
      await signalRService.requestConnectionInfo();
    } catch (error) {
      logger.error('Erro ao solicitar info de conexão', error as Error);
    }
  }, []);

  // Configurar event listeners do SignalR
  useEffect(() => {
    if (!mountedRef.current) return;

    // Handler para mudanças no estado da conexão
    const handleConnectionStateChanged = (connected: boolean) => {
      if (!mountedRef.current) return;
      
      setIsConnected(connected);
      setConnectionState(signalRService.connectionState);
    };

    // Handler para alertas de propriedade
    const handlePropertyAlert = (notification: PropertyAlertNotification) => {
      if (!mountedRef.current) return;
      
      logger.info(`Novo alerta de propriedade: ${JSON.stringify(notification)}`);
      
      if (showToasts) {
        toast.success('💰 Redução de preço detectada!', {
          description: notification.message || `${notification.propertyTitle}`,
          duration: 6000,
          action: {
            label: 'Ver',
            onClick: () => {
              logger.info(`Abrir propriedade: ${notification.propertyId}`);
            }
          }
        });
      }
    };

    // Handler para mudanças de preço  
    const handlePriceChange = (notification: PriceChangeNotification) => {
      if (!mountedRef.current) return;
      
      logger.info(`Mudança de preço: ${JSON.stringify(notification)}`);
      
      if (showToasts) {
        const changeType = notification.changeType === 'decrease' ? 'Redução' : 'Aumento';
        toast.info(`💰 ${changeType} de preço!`, {
          description: `${notification.propertyTitle} - €${notification.newPrice.toLocaleString()}`,
          duration: 5000
        });
      }
    };

    // Handler para notificações do sistema
    const handleSystemNotification = (notification: SystemNotification) => {
      if (!mountedRef.current) return;
      
      logger.info(`Notificação do sistema: ${JSON.stringify(notification)}`);
      
      if (showToasts) {
        const toastType = notification.type === 'error' ? 'error' : 
                         notification.type === 'warning' ? 'warning' :
                         notification.type === 'success' ? 'success' : 'info';
        
        toast[toastType](notification.title, {
          description: notification.message,
          duration: notification.type === 'error' ? 8000 : 4000
        });
      }
    };

    // Registrar listeners
    const removeConnectionListener = signalRService.onConnectionStateChanged(handleConnectionStateChanged);
    const removePropertyAlertListener = signalRService.onPropertyAlert(handlePropertyAlert);
    const removePriceChangeListener = signalRService.onPriceChange(handlePriceChange);
    const removeSystemNotificationListener = signalRService.onSystemNotification(handleSystemNotification);

    // Cleanup
    return () => {
      removeConnectionListener();
      removePropertyAlertListener();
      removePriceChangeListener();
      removeSystemNotificationListener();
    };
  }, [showToasts]);

  // Auto-conectar se solicitado e autenticado
  useEffect(() => {
    // Cleanup no desmonte
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Atualizar estado da conexão periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (mountedRef.current) {
        const currentState = signalRService.connectionState;
        const currentlyConnected = signalRService.isConnected;
        
        setConnectionState(currentState);
        setIsConnected(currentlyConnected);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    isConnecting,
    connectionState,
    connect,
    disconnect,
    acknowledgeNotification,
    requestUnreadNotifications,
    requestConnectionInfo
  };
}