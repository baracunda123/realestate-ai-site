// useSignalR.ts - Hook para gestão da conexão SignalR
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import signalRService from '../api/signalr.service';
import type { 
  PropertyAlertNotification,
  PriceChangeNotification,
  SystemNotification,
  PropertyUpdateNotification
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
  const { autoConnect = true, showToasts = true } = options;
  
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
          // Remover toast de conexão - utilizador não precisa saber
        }
      }
      
      return success;
    } catch (error) {
      console.error('❌ SignalR Hook: Erro na conexão:', error);
      
      if (mountedRef.current) {
        setIsConnecting(false);
        setIsConnected(false);
        setConnectionState('Disconnected');
        // Remover toast de erro - falha silenciosa
      }
      
      return false;
    }
  }, [isConnecting, isConnected]);

  // Função para desconectar
  const disconnect = useCallback(async () => {
    console.log('🔌 SignalR Hook: Desconectando...');
    
    try {
      await signalRService.disconnect();
      
      if (mountedRef.current) {
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionState('Disconnected');
        hasConnectedRef.current = false;
      }
      
      console.log('✅ SignalR Hook: Desconectado');
    } catch (error) {
      console.error('❌ SignalR Hook: Erro na desconexão:', error);
    }
  }, []);

  // Wrapper methods para facilitar uso
  const acknowledgeNotification = useCallback(async (notificationId: string) => {
    try {
      await signalRService.acknowledgeNotification(notificationId);
    } catch (error) {
      console.error('❌ SignalR Hook: Erro ao confirmar notificação:', error);
    }
  }, []);

  const requestUnreadNotifications = useCallback(async () => {
    try {
      await signalRService.requestUnreadNotifications();
    } catch (error) {
      console.error('❌ SignalR Hook: Erro ao solicitar não lidas:', error);
    }
  }, []);

  const requestConnectionInfo = useCallback(async () => {
    try {
      await signalRService.requestConnectionInfo();
    } catch (error) {
      console.error('❌ SignalR Hook: Erro ao solicitar info:', error);
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
      
      // Remover toast de reconexão - deve ser silencioso
    };

    // Handler para alertas de propriedade (MANTER - é o que interessa ao utilizador)
    const handlePropertyAlert = (notification: PropertyAlertNotification) => {
      if (!mountedRef.current) return;
      
      console.log('🏠 SignalR Hook: Novo alerta de propriedade:', notification);
      
      if (showToasts) {
        toast.success('💰 Redução de preço detectada!', {
          description: notification.message || `${notification.propertyTitle}`,
          duration: 6000,
          action: {
            label: 'Ver',
            onClick: () => {
              console.log('Abrir propriedade:', notification.propertyId);
              // TODO: Navegar para a propriedade
            }
          }
        });
      }
    };

    // Handler para mudanças de preço (MANTER - útil ao utilizador)  
    const handlePriceChange = (notification: PriceChangeNotification) => {
      if (!mountedRef.current) return;
      
      console.log('💰 SignalR Hook: Mudança de preço:', notification);
      
      if (showToasts) {
        const changeType = notification.changeType === 'decrease' ? 'Redução' : 'Aumento';
        toast.info(`💰 ${changeType} de preço!`, {
          description: `${notification.propertyTitle} - €${notification.newPrice.toLocaleString()}`,
          duration: 5000
        });
      }
    };

    // Handler para notificações do sistema (MANTER - importante)
    const handleSystemNotification = (notification: SystemNotification) => {
      if (!mountedRef.current) return;
      
      console.log('🔔 SignalR Hook: Notificação do sistema:', notification);
      
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
    // REMOVER auto-conexão - só conectar quando explicitamente solicitado
    // if (autoConnect && authUtils.isAuthenticated() && !isConnected && !isConnecting) {
    //   console.log('🚀 SignalR Hook: Auto-conectando...');
    //   connect();
    // }

    // Cleanup no desmonte
    return () => {
      mountedRef.current = false;
    };
  }, []); // Remove dependências para não auto-conectar

  // Atualizar estado da conexão periodicamente
  useEffect(() => {
    const interval = setInterval(() => {
      if (mountedRef.current) {
        const currentState = signalRService.connectionState;
        const currentlyConnected = signalRService.isConnected;
        
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
    connect,
    disconnect,
    acknowledgeNotification,
    requestUnreadNotifications,
    requestConnectionInfo
  };
}