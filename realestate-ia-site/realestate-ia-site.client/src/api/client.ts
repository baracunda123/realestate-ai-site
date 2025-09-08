// client.ts - client 
import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Interfaces
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: string;
}

interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  credits: number;
  subscription?: string;
  createdAt: string;
}

// Função simples para logs
function logClient(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const fullMessage = `[${timestamp}] CLIENT: ${message}`;

    // Para desenvolvimento: também alert se for muito importante
    if (message.includes('BLOQUEADO') || message.includes('ERRO')) {
        console.error(fullMessage);
    } else {
        console.log(fullMessage);
    }
}

// Classe para gerenciamento SEGURO de tokens
class SecureTokenManager {
  private static readonly SESSION_KEY = 'realestate_session_id';
  private static readonly USER_KEY = 'user_profile';
  
  private static accessTokenMemory: string | null = null;
  private static tokenExpiryMemory: Date | null = null;
  private static sessionId: string | null = null;
  private static isRefreshing = false; // Proteção contra múltiplas renovações

  static initialize(): void {
    this.sessionId = localStorage.getItem(this.SESSION_KEY) || uuidv4();
    localStorage.setItem(this.SESSION_KEY, this.sessionId);
    logClient(`Session inicializada: ${this.sessionId.substring(0, 8)}...`);
  }

  static saveTokens(tokenResponse: TokenResponse, user: UserProfile): void {
    // Validação rigorosa
    if (!tokenResponse?.accessToken || !tokenResponse?.expiresAt || !user?.id) {
      logClient('Dados de token inválidos');
      return;
    }

    const expiryDate = new Date(tokenResponse.expiresAt);
    if (expiryDate <= new Date()) {
      logClient('Token já expirado');
      return;
    }

    //APENAS EM MEMÓRIA
    this.accessTokenMemory = tokenResponse.accessToken;
    this.tokenExpiryMemory = expiryDate;
    
    try {
      
      //SÓ SALVA USER (sem dados sensíveis)
      const safeUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isEmailVerified: user.isEmailVerified,
      };
      localStorage.setItem(this.USER_KEY, JSON.stringify(safeUser));
      logClient(`Tokens salvos para: ${user.email}`);
    } catch {
      logClient('Erro ao salvar no localStorage');
    }
  }

  static getAccessToken(): string | null {
    if (this.accessTokenMemory && !this.isTokenExpiredMemory()) {
      return this.accessTokenMemory;
    }
    return null;
  }

  static getSessionId(): string {
    if (!this.sessionId) {
      this.initialize();
    }
    return this.sessionId!;
  }

  private static isTokenExpiredMemory(): boolean {
    if (!this.tokenExpiryMemory) return true;
    // Buffer de 30 segundos antes da expiração
    return new Date() >= new Date(this.tokenExpiryMemory.getTime() - 30000);
  }

  static isTokenExpired(): boolean {
    //  SÓ VERIFICA MEMÓRIA
    if (this.tokenExpiryMemory) {
      return this.isTokenExpiredMemory();
    }

    // Se não há token em memória, considera expirado
    return true;
  }

  static getCurrentUser(): UserProfile | null {
    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  static clearTokens(): void {
    this.accessTokenMemory = null;
    this.tokenExpiryMemory = null;
    this.isRefreshing = false;
    
    try {
      localStorage.removeItem(this.USER_KEY);
      logClient('Tokens limpos');
    } catch {
      logClient('Erro ao limpar localStorage');
    }
  }

  static updateAccessToken(newToken: string, expiresAt: string): void {
    const expiryDate = new Date(expiresAt);
    if (expiryDate <= new Date()) return;

    // APENAS EM MEMÓRIA
    this.accessTokenMemory = newToken;
    this.tokenExpiryMemory = expiryDate;
    
    logClient('Token atualizado');
  }

  static isAuthenticated(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    if (this.accessTokenMemory && !this.isTokenExpiredMemory()) {
      return true;
    }
    
    return !this.isTokenExpired();
  }

  static regenerateSession(): string {
    this.sessionId = uuidv4();
    try {
      localStorage.setItem(this.SESSION_KEY, this.sessionId);
      logClient(`Nova sessão gerada`);
    } catch  {
      logClient('Erro ao regenerar sessão');
    }
    return this.sessionId;
  }

  // Controle de estado de refresh
  static setRefreshing(value: boolean): void {
    this.isRefreshing = value;
  }

  static getIsRefreshing(): boolean {
    return this.isRefreshing;
  }
}

// Função segura para renovar token
async function refreshAccessToken(): Promise<TokenResponse | null> {
  // Evitar múltiplas renovações simultâneas
  if (SecureTokenManager.getIsRefreshing()) {
    return null;
  }

  try {
    logClient('Tentando renovar token');
    SecureTokenManager.setRefreshing(true);
    
    const refreshClient = axios.create({
      withCredentials: true,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const response = await refreshClient.post<{ token: TokenResponse }>('/api/auth/refresh-token');
    logClient('Token renovado com sucesso');
    return response.data.token;
  } catch {
    logClient('Falha na renovação do token');
    return null;
  } finally {
    SecureTokenManager.setRefreshing(false);
  }
}

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = '') {
    SecureTokenManager.initialize();

    this.client = axios.create({
      baseURL,
      withCredentials: true,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        // SEMPRE adicionar Session ID
        config.headers['X-Session-ID'] = SecureTokenManager.getSessionId();
        
        // Para endpoints protegidos, adicionar token se disponível
        if (!this.isAuthEndpoint(config.url)) {
          const accessToken = SecureTokenManager.getAccessToken();
          
          if (accessToken) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
            logClient(`Requisição: ${config.method?.toUpperCase()} ${config.url}`);
          } else {
            logClient(`Requisição sem token: ${config.method?.toUpperCase()} ${config.url}`);
          }
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        // Log para confirmar que interceptor funciona em sucesso
        logClient(`Resposta SUCESSO: ${response.status} - ${response.config?.method?.toUpperCase()} ${response.config?.url}`);
        return response;
      },
      async (error) => {
        // LOG IMEDIATO: confirmar que interceptor executa
        logClient(`INTERCEPTOR ERRO EXECUTADO!`);
        logClient(`Status: ${error.response?.status || 'SEM_STATUS'}`);
        logClient(`URL: ${error.config?.url || 'SEM_URL'}`);
        logClient(`Método: ${error.config?.method?.toUpperCase() || 'SEM_MÉTODO'}`);
        
        const originalRequest = error.config;
        
        // Não tentar renovação em endpoints de auth
        if (this.isAuthEndpoint(originalRequest.url)) {
          logClient(`Endpoint de auth - rejeitando erro`);
          return Promise.reject(error);
        }
        
        logClient(`Não é endpoint de auth - verificando 401...`);
        
        // Para endpoints protegidos: tentar renovação em 401
        if (error.response?.status === 401 && 
            !originalRequest._retry && 
            !SecureTokenManager.getIsRefreshing()) {
          
          logClient('Erro 401 - tentando renovar token');
          originalRequest._retry = true;
          
          try {
            const newTokens = await refreshAccessToken();
            const user = SecureTokenManager.getCurrentUser();
            
            if (newTokens && user) {
              SecureTokenManager.updateAccessToken(newTokens.accessToken, newTokens.expiresAt);
              originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
              return this.client(originalRequest);
            } else {
              logClient('Falha na renovação - limpando tokens');
              SecureTokenManager.clearTokens();
            }
          } catch {
            logClient('Erro na renovação - limpando tokens');
            SecureTokenManager.clearTokens();
          }
        } else {
          logClient(`Não é 401 ou já tentou retry. Status: ${error.response?.status}, Retry: ${originalRequest._retry}, Refreshing: ${SecureTokenManager.getIsRefreshing()}`);
        }
        
        logClient(`Rejeitando erro final`);
        return Promise.reject(error);
      }
    );
  }

  private isAuthEndpoint(url?: string): boolean {
    if (!url) return false;
    return url.includes('/api/auth/login') ||
           url.includes('/api/auth/register') ||
           url.includes('/api/auth/refresh-token') ||
           url.includes('/api/auth/confirm-email');
  }

  // Métodos HTTP
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }

  // Métodos de autenticação
  public saveAuthTokens(tokenResponse: TokenResponse, user: UserProfile): void {
    SecureTokenManager.saveTokens(tokenResponse, user);
  }

  public clearAuthTokens(): void {
    SecureTokenManager.clearTokens();
  }

  public isAuthenticated(): boolean {
    return SecureTokenManager.isAuthenticated();
  }

  public getCurrentUser(): UserProfile | null {
    return SecureTokenManager.getCurrentUser();
  }

  public getSessionId(): string {
    return SecureTokenManager.getSessionId();
  }

  public clearSession(): void {
    SecureTokenManager.regenerateSession();
  }
}

const apiClient = new ApiClient();

// LOG: Quando o client carrega
if (import.meta.env.DEV) {
    logClient('ApiClient carregado');
}

export default apiClient;
export { ApiClient, SecureTokenManager };
export type { TokenResponse, UserProfile };