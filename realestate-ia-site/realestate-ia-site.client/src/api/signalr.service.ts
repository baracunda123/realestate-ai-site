// signalr.service.ts - Serviço para notificações em tempo real
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { authUtils } from './auth.service';

interface PropertyAlertNotification {
  alertId: string;
  alertName: string;
  propertyId: string;
  propertyTitle: string;
  propertyPrice: number;
  propertyLocation: string;
  propertyImageUrl: string;
  createdAt: string;
  message: string;
  metadata: Record<string, any>;
}

interface PriceChangeNotification {
  propertyId: string;
  propertyTitle: string;
  oldPrice: number;
  newPrice: number;
  changeAmount: number;
  changePercentage: number;
  changeType: 'increase' | 'decrease';
  changedAt: string;
  propertyImageUrl: string;
  propertyLocation: string;
}

interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  createdAt: string;
  requiresAction: boolean;
  actionUrl?: string;
  actionText?: string;
  data: Record<string, any>;
}

interface PropertyUpdateNotification {
  propertyId: string;
  updateType: 'created' | 'updated' | 'deleted' | 'price_changed';
  propertyTitle: string;
  propertyLocation: string;
  price?: number;
  updatedAt: string;
  changes: Record<string, any>;
}

// Tipos de event listeners
type NotificationCallback<T> = (notification: T) => void;

interface NotificationListeners {
  propertyAlert: NotificationCallback<PropertyAlertNotification>[];
  priceChange: NotificationCallback<PriceChangeNotification>[];
  systemNotification: NotificationCallback<SystemNotification>[];
  propertyUpdate: NotificationCallback<PropertyUpdateNotification>[];
  connectionStateChanged: Array<(connected: boolean) => void>;
}

class SignalRService {
  private connection: HubConnection | null = null;
  private listeners: NotificationListeners = {
    propertyAlert: [],
    priceChange: [],
    systemNotification: [],
    propertyUpdate: [],
    connectionStateChanged: []
  };
  private connectionAttempts = 0;
  private maxRetryAttempts = 5;
  private retryDelay = 1000; // 1 segundo inicial
  private isIntentionallyDisconnected = false;

  constructor() {
    this.setupConnection();
  }

  private setupConnection() {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '';
    const hubUrl = `${apiUrl}/notificationHub`;

    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => {
          const token = authUtils.getStoredTokens()?.accessToken;
          return token || '';
        },
        withCredentials: true
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          const delay = Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 16000);
          console.log(`?? SignalR: Tentativa de reconexão ${retryContext.previousRetryCount + 1} em ${delay}ms`);
          return delay;
        }
      })
      .configureLogging(import.meta.env.DEV ? LogLevel.Information : LogLevel.Warning)
      .build();

    // Event handlers para conexão
    this.connection.onclose((error) => {
      console.log('? SignalR: Conexão fechada', error);
      this.notifyConnectionStateChanged(false);
      
      if (!this.isIntentionallyDisconnected && this.connectionAttempts < this.maxRetryAttempts) {
        this.scheduleReconnect();
      }
    });

    this.connection.onreconnecting((error) => {
      console.log('?? SignalR: Tentando reconectar...', error);
      this.notifyConnectionStateChanged(false);
    });

    this.connection.onreconnected(() => {
      console.log('? SignalR: Reconectado com sucesso');
      this.connectionAttempts = 0;
      this.notifyConnectionStateChanged(true);
      this.rejoinGroups();
    });

    // Event handlers para notificações
    this.connection.on('PropertyAlert', (notification: PropertyAlertNotification) => {
      console.log('?? Nova propriedade encontrada:', notification);
      this.notifyListeners('propertyAlert', notification);
    });

    this.connection.on('PriceChange', (notification: PriceChangeNotification) => {
      console.log('?? Mudança de preço:', notification);
      this.notifyListeners('priceChange', notification);
    });

    this.connection.on('SystemNotification', (notification: SystemNotification) => {
      console.log('?? Notificação do sistema:', notification);
      this.notifyListeners('systemNotification', notification);
    });

    this.connection.on('PropertyUpdate', (notification: PropertyUpdateNotification) => {
      console.log('?? Atualização de propriedade:', notification);
      this.notifyListeners('propertyUpdate', notification);
    });

    this.connection.on('Pong', (timestamp: string) => {
      console.log('?? SignalR: Pong recebido', timestamp);
    });
  }

  async connect(): Promise<boolean> {
    if (!this.connection) {
      this.setupConnection();
    }

    if (this.connection!.state === 'Connected') {
      return true;
    }

    try {
      this.isIntentionallyDisconnected = false;
      await this.connection!.start();
      
      console.log('? SignalR: Conectado com sucesso');
      this.connectionAttempts = 0;
      this.notifyConnectionStateChanged(true);
      
      // Enviar ping inicial
      this.startPingInterval();
      
      // Juntar-se aos grupos necessários
      await this.joinPropertyAlertsGroup();
      
      return true;
    } catch (error) {
      console.error('? SignalR: Erro ao conectar', error);
      this.notifyConnectionStateChanged(false);
      this.scheduleReconnect();
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      this.isIntentionallyDisconnected = true;
      await this.connection.stop();
      console.log('?? SignalR: Desconectado intencionalmente');
    }
  }

  private scheduleReconnect() {
    if (this.connectionAttempts >= this.maxRetryAttempts) {
      console.error('? SignalR: Máximo de tentativas de reconexão atingido');
      return;
    }

    this.connectionAttempts++;
    const delay = this.retryDelay * Math.pow(2, this.connectionAttempts - 1);
    
    setTimeout(async () => {
      console.log(`?? SignalR: Tentativa de reconexão ${this.connectionAttempts}/${this.maxRetryAttempts}`);
      await this.connect();
    }, delay);
  }

  private startPingInterval() {
    setInterval(async () => {
      if (this.connection?.state === 'Connected') {
        try {
          await this.connection.invoke('Ping');
        } catch (error) {
          console.error('? SignalR: Erro no ping', error);
        }
      }
    }, 30000); // Ping a cada 30 segundos
  }

  private async rejoinGroups() {
    try {
      await this.joinPropertyAlertsGroup();
    } catch (error) {
      console.error('? SignalR: Erro ao reentrar nos grupos', error);
    }
  }

  // Métodos para grupos
  async joinPropertyAlertsGroup(): Promise<void> {
    if (this.connection?.state === 'Connected') {
      try {
        await this.connection.invoke('JoinPropertyAlertsGroup');
        console.log('? SignalR: Entrou no grupo de alertas de propriedades');
      } catch (error) {
        console.error('? SignalR: Erro ao entrar no grupo de alertas', error);
      }
    }
  }

  async leavePropertyAlertsGroup(): Promise<void> {
    if (this.connection?.state === 'Connected') {
      try {
        await this.connection.invoke('LeavePropertyAlertsGroup');
        console.log('?? SignalR: Saiu do grupo de alertas de propriedades');
      } catch (error) {
        console.error('? SignalR: Erro ao sair do grupo de alertas', error);
      }
    }
  }

  // Métodos para listeners
  onPropertyAlert(callback: NotificationCallback<PropertyAlertNotification>) {
    this.listeners.propertyAlert.push(callback);
    return () => this.removeListener('propertyAlert', callback);
  }

  onPriceChange(callback: NotificationCallback<PriceChangeNotification>) {
    this.listeners.priceChange.push(callback);
    return () => this.removeListener('priceChange', callback);
  }

  onSystemNotification(callback: NotificationCallback<SystemNotification>) {
    this.listeners.systemNotification.push(callback);
    return () => this.removeListener('systemNotification', callback);
  }

  onPropertyUpdate(callback: NotificationCallback<PropertyUpdateNotification>) {
    this.listeners.propertyUpdate.push(callback);
    return () => this.removeListener('propertyUpdate', callback);
  }

  onConnectionStateChanged(callback: (connected: boolean) => void) {
    this.listeners.connectionStateChanged.push(callback);
    return () => this.removeListener('connectionStateChanged', callback);
  }

  private removeListener<K extends keyof NotificationListeners>(
    type: K, 
    callback: NotificationListeners[K][number]
  ) {
    const index = this.listeners[type].indexOf(callback);
    if (index > -1) {
      this.listeners[type].splice(index, 1);
    }
  }

  private notifyListeners<K extends keyof NotificationListeners>(
    type: K,
    data: K extends 'connectionStateChanged' ? boolean : any
  ) {
    this.listeners[type].forEach(callback => {
      try {
        (callback as any)(data);
      } catch (error) {
        console.error(`? SignalR: Erro no listener ${type}:`, error);
      }
    });
  }

  private notifyConnectionStateChanged(connected: boolean) {
    this.notifyListeners('connectionStateChanged', connected);
  }

  // Estado da conexão
  get isConnected(): boolean {
    return this.connection?.state === 'Connected';
  }

  get connectionState(): string {
    return this.connection?.state || 'Disconnected';
  }

  // Utilitários para notificações
  static formatNotificationForToast(notification: SystemNotification | PropertyAlertNotification) {
    if ('alertName' in notification) {
      // PropertyAlertNotification
      return {
        title: `?? ${notification.alertName}`,
        description: notification.message,
        action: {
          label: 'Ver Propriedade',
          onClick: () => window.location.href = `/property/${notification.propertyId}`
        }
      };
    } else {
      // SystemNotification
      const emoji = {
        info: '??',
        warning: '??',
        error: '?',
        success: '?'
      }[notification.type] || '??';

      return {
        title: `${emoji} ${notification.title}`,
        description: notification.message,
        action: notification.requiresAction && notification.actionUrl ? {
          label: notification.actionText || 'Ver Mais',
          onClick: () => window.location.href = notification.actionUrl!
        } : undefined
      };
    }
  }
}

// Instância singleton
const signalRService = new SignalRService();

export default signalRService;
export type {
  PropertyAlertNotification,
  PriceChangeNotification,
  SystemNotification,
  PropertyUpdateNotification
};

// Auto-conectar quando o usuário estiver autenticado
if (authUtils.isAuthenticated()) {
  signalRService.connect().catch(console.error);
}

// Log apenas quando carrega em desenvolvimento
if (import.meta.env.DEV) {
  console.log('?? SignalR Service carregado');
}