// signalr.service.ts - Serviço para notificações em tempo real
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { authUtils } from './auth.service';
//import type { UserProfile } from './client';

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
    // Melhor detecção da URL do servidor
    const apiUrl = import.meta.env?.VITE_API_BASE_URL 
                  || import.meta.env?.VITE_API_URL 
                  || (window.location.protocol === 'https:' ? 'https://localhost:7001' : 'http://localhost:5000')
                  || '';
    
    const hubUrl = `${apiUrl}/hubs/notifications`;
    
    console.log('?? SignalR: Configurando conexão');
    console.log('?? API URL:', apiUrl);
    console.log('?? Hub URL:', hubUrl);

    this.connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: async () => {
          try {
            // Importar dinamicamente o SecureTokenManager para evitar dependência circular
            const { SecureTokenManager } = await import('./client');
            
            // Tentar obter token válido
            const token = SecureTokenManager.getAccessToken();
            if (token) {
              console.log('?? SignalR: Token obtido para autenticação');
              return token;
            }
            
            // Se não tem token mas está autenticado, pode precisar fazer refresh
            if (authUtils.isAuthenticated()) {
              console.log('?? SignalR: Usuário autenticado mas sem token válido');
              return ''; // Retorna vazio, mas tenta conectar
            }
            
            console.log('? SignalR: Sem autenticação - não conectando');
            return '';
          } catch (error) {
            console.error('? SignalR: Erro ao obter token:', error);
            return '';
          }
        },
        withCredentials: true,
        skipNegotiation: false, // Permite negociação para melhor compatibilidade
        transport: undefined // Deixa o SignalR escolher o melhor transporte
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(import.meta.env?.DEV ? LogLevel.Information : LogLevel.Warning)
      .build();

    this.setupEventHandlers();
    this.setupNotificationHandlers();
  }

  private setupEventHandlers() {
    if (!this.connection) return;

    this.connection.onclose((error?: Error) => {
      console.log('SignalR: Conexão fechada', error);
      this.notifyConnectionStateChanged(false);
      this.stopPing();
    });

    this.connection.onreconnecting((error?: Error) => {
      console.log('SignalR: Reconectando...', error);
      this.notifyConnectionStateChanged(false);
    });

    this.connection.onreconnected(() => {
      console.log('SignalR: Reconectado');
      this.notifyConnectionStateChanged(true);
      this.startPing();
      this.rejoinGroups();
    });
  }

  private setupNotificationHandlers() {
    if (!this.connection) return;

    // Handlers para notificações de propriedades
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

    // Handlers específicos do hub existente
    this.connection.on('Connected', (connectionInfo: { userId: string; connectionId: string; timestamp: string }) => {
      console.log('? SignalR: Confirmação de conexão do servidor:', connectionInfo);
    });

    this.connection.on('NotificationAcknowledged', (notificationId: string) => {
      console.log('? Confirmação de notificação:', notificationId);
    });

    this.connection.on('UnreadNotificationsRequested', () => {
      console.log('?? Servidor confirmou solicitação de não lidas');
    });

    this.connection.on('ConnectionInfo', (info: { 
      ConnectionId: string; 
      UserId: string; 
      UserAgent?: string; 
      RemoteIpAddress?: string; 
      ConnectedAt: string; 
    }) => {
      console.log('?? Informações de conexão:', info);
    });

    // Handlers para eventos de notificações específicas (usados pelo RealtimeNotificationService)
    this.connection.on('NewPriceAlert', (data: { 
      Type: string; 
      Notification?: { 
        AlertId?: string; 
        AlertName?: string; 
        PropertyId?: string; 
        PropertyTitle?: string; 
        NewPrice?: number; 
        PropertyLocation?: string; 
        PropertyImageUrl?: string; 
      }; 
      Timestamp?: string; 
      Message?: string; 
    }) => {
      console.log('?? Novo alerta de preço:', data);
      // Converter para formato esperado pelos listeners
      const notification: PropertyAlertNotification = {
        alertId: data.Notification?.AlertId || '',
        alertName: data.Notification?.AlertName || 'Alerta de Preço',
        propertyId: data.Notification?.PropertyId || '',
        propertyTitle: data.Notification?.PropertyTitle || '',
        propertyPrice: data.Notification?.NewPrice || 0,
        propertyLocation: data.Notification?.PropertyLocation || '',
        propertyImageUrl: data.Notification?.PropertyImageUrl || '',
        createdAt: data.Timestamp || new Date().toISOString(),
        message: data.Message || 'Nova redução de preço detectada!',
        metadata: data.Notification || {}
      };
      this.notifyListeners('propertyAlert', notification);
    });

    // Handlers padrão
    this.connection.on('Pong', (timestamp: string) => {
      console.log('?? Pong recebido:', timestamp);
    });

    this.connection.on('Error', (errorMessage: string) => {
      console.error('? Erro do hub:', errorMessage);
    });
  }

  async connect(): Promise<boolean> {
    // Verificar se está autenticado antes de tentar conectar
    if (!authUtils.isAuthenticated()) {
      console.log('? SignalR: Usuário não autenticado - conexão ignorada');
      return false;
    }

    if (!this.connection) {
      console.log('?? SignalR: Configurando nova conexão');
      this.setupConnection();
    }

    if (this.connection!.state === 'Connected') {
      console.log('? SignalR: Já conectado');
      return true;
    }

    try {
      console.log('?? SignalR: Tentando conectar...');
      console.log('?? SignalR: URL:', this.connection!.baseUrl);
      console.log('?? SignalR: Estado de auth:', authUtils.isAuthenticated());
      
      await this.connection!.start();
      
      console.log('? SignalR: Conectado com sucesso!');
      console.log('?? SignalR: ConnectionId:', this.connection!.connectionId);
      console.log('?? SignalR: Estado:', this.connection!.state);
      
      this.notifyConnectionStateChanged(true);
      this.startPing();
      
      // Aguardar um pouco antes de solicitar info de conexão
      setTimeout(() => {
        this.requestConnectionInfo();
      }, 1000);
      
      return true;
    } catch (error: unknown) {
      console.error('? SignalR: Erro ao conectar', error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('404')) {
        console.error('?? SignalR: Hub não encontrado (404)');
        console.error('?? Verifique: 1) Servidor rodando, 2) Hub mapeado, 3) URL correta');
      } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        console.error('?? SignalR: Erro de autenticação (401)');
        console.error('?? Verifique: 1) Token JWT válido, 2) Claims de usuário');
      } else if (errorMessage.includes('negotiate')) {
        console.error('?? SignalR: Erro na negociação');
        console.error('?? Verifique: 1) CORS configurado, 2) Cookies habilitados');
      }
      
      console.error('?? Detalhes do erro:', {
        message: errorMessage,
        connectionState: this.connection?.state,
        baseUrl: this.connection?.baseUrl
      });
      
      this.notifyConnectionStateChanged(false);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      this.stopPing();
      await this.connection.stop();
      console.log('SignalR: Desconectado');
    }
  }

  private startPing() {
    this.stopPing();
    this.pingInterval = setInterval(async () => {
      if (this.connection?.state === 'Connected') {
        try {
          await this.connection.invoke('Ping');
        } catch (error) {
          console.error('SignalR: Erro no ping', error);
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
    // Grupos são gerenciados automaticamente pelo hub baseado no usuário
    console.log('?? SignalR: Reconectado - grupos reestabelecidos automaticamente');
  }

  // Métodos simplificados (usar os métodos que existem no hub)
  async requestConnectionInfo(): Promise<void> {
    if (this.connection?.state === 'Connected') {
      try {
        await this.connection.invoke('GetConnectionInfo');
        console.log('?? SignalR: Info de conexão solicitada');
      } catch (error) {
        console.error('? SignalR: Erro ao solicitar info', error);
      }
    }
  }

  async acknowledgeNotification(notificationId: string): Promise<void> {
    if (this.connection?.state === 'Connected') {
      try {
        await this.connection.invoke('AcknowledgeNotification', notificationId);
        console.log('? SignalR: Notificação confirmada:', notificationId);
      } catch (error) {
        console.error('? SignalR: Erro ao confirmar notificação', error);
      }
    }
  }

  async requestUnreadNotifications(): Promise<void> {
    if (this.connection?.state === 'Connected') {
      try {
        await this.connection.invoke('RequestUnreadNotifications');
        console.log('?? SignalR: Notificações não lidas solicitadas');
      } catch (error) {
        console.error('? SignalR: Erro ao solicitar não lidas', error);
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
        (callback as (data: unknown) => void)(data);
      } catch (error) {
        console.error(` SignalR: Erro no listener ${type}:`, error);
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
      title: isPropertyAlert ? ` ${notification.alertName}` : ` ${notification.title}`,
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

// Não conectar automaticamente - deixar os componentes controlarem
// if (authUtils.isAuthenticated()) {
//   signalRService.connect().catch(console.error);
// }