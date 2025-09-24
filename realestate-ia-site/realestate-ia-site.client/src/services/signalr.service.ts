// signalr.service.ts - Serviço para comunicação SignalR em tempo real
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';

export interface SignalRNotification {
  type: 'price_alert' | 'alert_created' | 'unread_count_update' | 'generic_message';
  notification?: any;
  alert?: any;
  unreadCount?: number;
  message?: string;
  data?: any;
  timestamp: string;
}

export interface SignalRConnectionInfo {
  connectionId: string;
  userId: string;
  userAgent?: string;
  remoteIpAddress?: string;
  connectedAt: string;
}

class SignalRService {
  private connection: HubConnection | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 segundos

  // Event listeners
  private eventListeners: { [event: string]: Function[] } = {};

  constructor() {
    // Não inicializar conexão automaticamente
  }

  /**
   * Inicializar conexão SignalR
   */
  async initialize(accessToken: string): Promise<boolean> {
    if (this.connection && this.connection.state === 'Connected') {
      console.log('?? SignalR já está conectado');
      return true;
    }

    if (this.isConnecting) {
      console.log('?? SignalR já está tentando conectar...');
      return false;
    }

    try {
      this.isConnecting = true;

      // Construir conexão
      this.connection = new HubConnectionBuilder()
        .withUrl('/hubs/notifications', {
          accessTokenFactory: () => accessToken,
          withCredentials: true
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.previousRetryCount < 3) {
              return 2000; // 2 segundos para primeiras tentativas
            } else if (retryContext.previousRetryCount < 6) {
              return 5000; // 5 segundos
            } else {
              return 10000; // 10 segundos para tentativas subsequentes
            }
          }
        })
        .configureLogging(
          import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning
        )
        .build();

      // Configurar event listeners
      this.setupEventListeners();

      // Conectar
      await this.connection.start();
      
      console.log('?? SignalR conectado com sucesso');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      
      // Trigger evento de conexão estabelecida
      this.emit('connected', { connectionId: this.connection.connectionId });
      
      return true;
    } catch (error) {
      this.isConnecting = false;
      console.error('? Erro ao conectar SignalR:', error);
      
      // Tentar reconectar após delay
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`?? Tentando reconectar SignalR (${this.reconnectAttempts}/${this.maxReconnectAttempts}) em ${this.reconnectDelay}ms...`);
        
        setTimeout(() => {
          this.initialize(accessToken);
        }, this.reconnectDelay);
      }
      
      return false;
    }
  }

  /**
   * Desconectar SignalR
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.stop();
        console.log('?? SignalR desconectado');
        this.emit('disconnected', {});
      } catch (error) {
        console.error('? Erro ao desconectar SignalR:', error);
      }
      
      this.connection = null;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
    }
  }

  /**
   * Verificar se está conectado
   */
  isConnected(): boolean {
    return this.connection?.state === 'Connected';
  }

  /**
   * Obter estado da conexão
   */
  getConnectionState(): string {
    return this.connection?.state || 'Disconnected';
  }

  /**
   * Configurar event listeners do SignalR
   */
  private setupEventListeners(): void {
    if (!this.connection) return;

    // Evento: Nova notificação de redução de preço
    this.connection.on('NewPriceAlert', (data: SignalRNotification) => {
      console.log('?? Nova notificação de preço recebida:', data);
      this.emit('newPriceAlert', data);
      this.emit('notification', data);
    });

    // Evento: Novo alerta criado
    this.connection.on('AlertCreated', (data: SignalRNotification) => {
      console.log('?? Alerta criado:', data);
      this.emit('alertCreated', data);
      this.emit('notification', data);
    });

    // Evento: Atualização da contagem de não lidas
    this.connection.on('UnreadCountUpdate', (data: SignalRNotification) => {
      console.log('?? Contagem não lidas atualizada:', data.unreadCount);
      this.emit('unreadCountUpdate', data);
    });

    // Evento: Mensagem genérica
    this.connection.on('Message', (data: SignalRNotification) => {
      console.log('?? Mensagem genérica recebida:', data);
      this.emit('message', data);
      this.emit('notification', data);
    });

    // Evento: Conexão estabelecida (callback do hub)
    this.connection.on('Connected', (data: SignalRConnectionInfo) => {
      console.log('?? Confirmação de conexão do servidor:', data);
      this.emit('serverConnected', data);
    });

    // Evento: Notificação reconhecida
    this.connection.on('NotificationAcknowledged', (notificationId: string) => {
      console.log('? Notificação reconhecida:', notificationId);
      this.emit('notificationAcknowledged', { notificationId });
    });

    // Evento: Ping do servidor
    this.connection.on('Ping', (data: any) => {
      console.log('?? Ping recebido do servidor:', data);
      // Responder com pong se necessário
    });

    // Eventos de reconexão automática
    this.connection.onreconnecting((error) => {
      console.log('?? SignalR reconectando...', error);
      this.emit('reconnecting', { error: error?.message });
    });

    this.connection.onreconnected((connectionId) => {
      console.log('? SignalR reconectado:', connectionId);
      this.emit('reconnected', { connectionId });
      this.reconnectAttempts = 0;
    });

    this.connection.onclose((error) => {
      console.log('? SignalR conexão fechada:', error);
      this.emit('closed', { error: error?.message });
    });
  }

  /**
   * Métodos para comunicação com o hub
   */
  async acknowledgeNotification(notificationId: string): Promise<void> {
    if (this.connection && this.isConnected()) {
      try {
        await this.connection.invoke('AcknowledgeNotification', notificationId);
      } catch (error) {
        console.error('? Erro ao confirmar notificação:', error);
      }
    }
  }

  async requestUnreadNotifications(): Promise<void> {
    if (this.connection && this.isConnected()) {
      try {
        await this.connection.invoke('RequestUnreadNotifications');
      } catch (error) {
        console.error('? Erro ao solicitar notificações não lidas:', error);
      }
    }
  }

  async getConnectionInfo(): Promise<void> {
    if (this.connection && this.isConnected()) {
      try {
        await this.connection.invoke('GetConnectionInfo');
      } catch (error) {
        console.error('? Erro ao obter informações da conexão:', error);
      }
    }
  }

  /**
   * Sistema de eventos personalizado
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  off(event: string, callback?: Function): void {
    if (!this.eventListeners[event]) return;

    if (callback) {
      this.eventListeners[event] = this.eventListeners[event].filter(
        cb => cb !== callback
      );
    } else {
      delete this.eventListeners[event];
    }
  }

  private emit(event: string, data: any): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`? Erro no callback do evento ${event}:`, error);
        }
      });
    }
  }

  /**
   * Obter informações de debug
   */
  getDebugInfo(): object {
    return {
      connectionState: this.getConnectionState(),
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      connectionId: this.connection?.connectionId,
      baseUrl: this.connection?.baseUrl,
      eventListeners: Object.keys(this.eventListeners).map(key => ({
        event: key,
        listenerCount: this.eventListeners[key].length
      }))
    };
  }
}

// Singleton instance
const signalRService = new SignalRService();

export default signalRService;