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
  metadata: Record<string, unknown>;
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
  data: Record<string, unknown>;
}

interface PropertyUpdateNotification {
  propertyId: string;
  updateType: 'created' | 'updated' | 'deleted' | 'price_changed';
  propertyTitle: string;
  propertyLocation: string;
  price?: number;
  updatedAt: string;
  changes: Record<string, unknown>;
}

type NotificationCallback<T> = (notification: T) => void;

interface NotificationListeners {
  propertyAlert: NotificationCallback<PropertyAlertNotification>[];
  priceChange: NotificationCallback<PriceChangeNotification>[];
  systemNotification: NotificationCallback<SystemNotification>[];
  propertyUpdate: NotificationCallback<PropertyUpdateNotification>[];
  connectionStateChanged: Array<(connected: boolean) => void>;
}

// Adicionar uma interface para o authUtils com os métodos necessários
interface AuthUtils {
  clearTokens: () => void;
  isAuthenticated: () => boolean;
  getCurrentUser: () => { id: string; email: string; [key: string]: unknown } | null;
  getSessionId: () => string;
  getAccessToken?: () => string | null;
}

// Extend authUtils para incluir o método necessário
const extendedAuthUtils = {
  ...authUtils,
  getAccessToken: (): string | null => {
    // Implementar uma forma de obter o token - pode ser via localStorage ou cookie
    try {
      const storedData = localStorage.getItem('auth_tokens');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        return parsed.accessToken || null;
      }
      return null;
    } catch {
      return null;
    }
  }
} as AuthUtils & { getAccessToken: () => string | null };

class SignalRService {
  private connection: HubConnection | null = null;
  private listeners: NotificationListeners = {
    propertyAlert: [],
    priceChange: [],
    systemNotification: [],
    propertyUpdate: [],
    connectionStateChanged: []
  };
  private pingInterval?: NodeJS.Timeout;

  constructor() {
    this.setupConnection();
  }

  private setupConnection() {
    const apiUrl = (import.meta as { env: { VITE_API_BASE_URL?: string; DEV?: boolean } }).env.VITE_API_BASE_URL || '';
    const hubUrl = `${apiUrl}/notificationHub`;

    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => extendedAuthUtils.getAccessToken() || '',
        withCredentials: true
      })
      .withAutomaticReconnect()
      .configureLogging((import.meta as { env: { DEV?: boolean } }).env.DEV ? LogLevel.Information : LogLevel.Warning)
      .build();

    this.setupEventHandlers();
    this.setupNotificationHandlers();
  }

  private setupEventHandlers() {
    if (!this.connection) return;

    this.connection.onclose((error?: Error) => {
      console.log('?? SignalR: Conexão fechada', error);
      this.notifyConnectionStateChanged(false);
      this.stopPing();
    });

    this.connection.onreconnecting((error?: Error) => {
      console.log('?? SignalR: Reconectando...', error);
      this.notifyConnectionStateChanged(false);
    });

    this.connection.onreconnected(() => {
      console.log('? SignalR: Reconectado');
      this.notifyConnectionStateChanged(true);
      this.startPing();
      this.rejoinGroups();
    });
  }

  private setupNotificationHandlers() {
    if (!this.connection) return;

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

    this.connection.on('Pong', () => {
      // Ping recebido - conexão ativa
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
      await this.connection!.start();
      
      console.log('? SignalR: Conectado');
      this.notifyConnectionStateChanged(true);
      this.startPing();
      await this.joinPropertyAlertsGroup();
      
      return true;
    } catch (error) {
      console.error('? SignalR: Erro ao conectar', error);
      this.notifyConnectionStateChanged(false);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      this.stopPing();
      await this.connection.stop();
      console.log('?? SignalR: Desconectado');
    }
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(async () => {
      if (this.connection?.state === 'Connected') {
        try {
          await this.connection.invoke('Ping');
        } catch (error) {
          console.error('? SignalR: Erro no ping', error);
        }
      }
    }, 30000);
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
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
        console.log('? SignalR: Entrou no grupo de alertas');
      } catch (error) {
        console.error('? SignalR: Erro ao entrar no grupo', error);
      }
    }
  }

  async leavePropertyAlertsGroup(): Promise<void> {
    if (this.connection?.state === 'Connected') {
      try {
        await this.connection.invoke('LeavePropertyAlertsGroup');
        console.log('?? SignalR: Saiu do grupo de alertas');
      } catch (error) {
        console.error('? SignalR: Erro ao sair do grupo', error);
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
    const listeners = this.listeners[type] as unknown[];
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  }

  private notifyListeners<K extends keyof NotificationListeners>(
    type: K,
    data: K extends 'connectionStateChanged' ? boolean : 
          K extends 'propertyAlert' ? PropertyAlertNotification :
          K extends 'priceChange' ? PriceChangeNotification :
          K extends 'systemNotification' ? SystemNotification :
          K extends 'propertyUpdate' ? PropertyUpdateNotification :
          never
  ) {
    const listeners = this.listeners[type];
    listeners.forEach(callback => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // Utilitário para notificações (simplificado)
  static formatNotificationForToast(notification: SystemNotification | PropertyAlertNotification) {
    const isPropertyAlert = 'alertName' in notification;
    
    return {
      title: isPropertyAlert ? `?? ${notification.alertName}` : `?? ${notification.title}`,
      description: isPropertyAlert ? notification.message : notification.message,
      action: isPropertyAlert ? {
        label: 'Ver Propriedade',
        onClick: () => window.location.href = `/property/${notification.propertyId}`
      } : notification.requiresAction && notification.actionUrl ? {
        label: notification.actionText || 'Ver Mais',
        onClick: () => window.location.href = notification.actionUrl!
      } : undefined
    };
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

// Auto-conectar quando autenticado
if (extendedAuthUtils.isAuthenticated()) {
  signalRService.connect().catch(console.error);
}