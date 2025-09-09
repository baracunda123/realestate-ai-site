// client.ts - API Client
import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';

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
  name?: string;
  avatarUrl?: string;
  phoneNumber?: string;
  subscription?: string;
  credits?: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt?: string;
  isPremium?: boolean;
}

interface ApiError {
  success: false;
  message: string;
  errors?: string[];
  code?: string;
  statusCode?: number;
}

// Função segura para logs
function logClient(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const fullMessage = `[${timestamp}] CLIENT: ${message}`;

  switch (level) {
    case 'error':
      console.error(fullMessage);
      break;
    case 'warn':
      console.warn(fullMessage);
      break;
    default:
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
  private static isRefreshing = false;

  static initialize(): void {
    this.sessionId = localStorage.getItem(this.SESSION_KEY) || uuidv4();
    localStorage.setItem(this.SESSION_KEY, this.sessionId);
    logClient(`Session inicializada: ${this.sessionId.substring(0, 8)}...`);
  }

  static saveTokens(tokenResponse: TokenResponse, user: UserProfile): void {
    // Validação básica apenas
    if (!tokenResponse?.accessToken || !tokenResponse?.expiresAt || !user?.id) {
      logClient('Dados de token inválidos fornecidos', 'warn');
      return;
    }

    const expiryDate = new Date(tokenResponse.expiresAt);
    if (expiryDate <= new Date()) {
      logClient('Token já expirado', 'warn');
      return;
    }

    // APENAS EM MEMÓRIA para o access token
    this.accessTokenMemory = tokenResponse.accessToken;
    this.tokenExpiryMemory = expiryDate;
    
    try {
      // Salvar dados do usuário (não sensíveis) no localStorage
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      logClient(`Tokens salvos para: ${user.email}`);
    } catch (error) {
        logClient('Erro ao salvar dados do usuário', 'error');
        console.error(error);
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
    if (this.tokenExpiryMemory) {
      return this.isTokenExpiredMemory();
    }
    return true;
  }

  static getCurrentUser(): UserProfile | null {
    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      
      // Validação básica apenas
      if (!user.id || !user.email) {
        logClient('Dados de usuário inválidos no storage', 'warn');
        this.clearTokens();
        return null;
      }
      
      return user;
    } catch (error) {
        logClient('Erro ao analisar dados do usuário', 'warn');
        console.error(error);
      this.clearTokens();
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
    } catch (error) {
        logClient('Erro ao limpar localStorage', 'warn');
        console.error(error);
    }
  }

  static updateAccessToken(newToken: string, expiresAt: string): void {
    const expiryDate = new Date(expiresAt);
    if (expiryDate <= new Date()) return;

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
      logClient('Nova sessão gerada');
    } catch (error) {
      logClient('Erro ao regenerar sessão', 'warn');
    }
    return this.sessionId;
  }

  static setRefreshing(value: boolean): void {
    this.isRefreshing = value;
  }

  static getIsRefreshing(): boolean {
    return this.isRefreshing;
  }
}

// Rate limiting básico no cliente
class ClientRateLimit {
  private static requests = new Map<string, { count: number; resetTime: number }>();

  static checkLimit(endpoint: string, maxRequests: number = 60, windowMs: number = 60000): boolean {
    const now = Date.now();
    const existing = this.requests.get(endpoint);

    if (!existing || now > existing.resetTime) {
      this.requests.set(endpoint, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (existing.count >= maxRequests) {
      logClient(`Rate limit excedido para ${endpoint}`, 'warn');
      return false;
    }

    existing.count++;
    return true;
  }
}

// Função para renovar token - SIMPLIFICADA
async function refreshAccessToken(): Promise<TokenResponse | null> {
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
    
    // O servidor retorna { message: string, token: TokenResponse } diretamente
    const response = await refreshClient.post<{ message: string; token: TokenResponse }>('/api/auth/refresh-token');
    
    if (response.data && response.data.token) {
      logClient('Token renovado com sucesso');
      return response.data.token;
    } else {
      logClient('Resposta de renovação inválida', 'warn');
      return null;
    }
  } catch (error) {
    logClient('Falha na renovação do token', 'error');
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
        // Rate limiting check básico
        if (config.url && !ClientRateLimit.checkLimit(config.url)) {
          throw new Error('Rate limit exceeded');
        }

        // Sempre adicionar Session ID
        config.headers['X-Session-ID'] = SecureTokenManager.getSessionId();
        
        // Para endpoints protegidos, adicionar token se disponível
        if (!this.isAuthEndpoint(config.url)) {
          const accessToken = SecureTokenManager.getAccessToken();
          
          if (accessToken) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
            logClient(`Requisição autenticada: ${config.method?.toUpperCase()} ${config.url}`);
          } else {
            logClient(`Requisição sem token: ${config.method?.toUpperCase()} ${config.url}`);
          }
        } else {
          logClient(`Requisição de auth: ${config.method?.toUpperCase()} ${config.url}`);
        }
        
        return config;
      },
      (error) => {
        logClient(`Erro no interceptor de requisição: ${error.message}`, 'error');
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logClient(`Resposta SUCESSO: ${response.status} - ${response.config?.method?.toUpperCase()} ${response.config?.url}`);
        return response;
      },
      async (error) => {
        logClient(`INTERCEPTOR ERRO: Status ${error.response?.status || 'SEM_STATUS'}`, 'error');
        
        const originalRequest = error.config;
        
        // Não tentar renovação em endpoints de auth
        if (this.isAuthEndpoint(originalRequest.url)) {
          return Promise.reject(error);
        }
        
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
              logClient('Falha na renovação - limpando tokens', 'warn');
              SecureTokenManager.clearTokens();
            }
          } catch (refreshError) {
            logClient('Erro na renovação - limpando tokens', 'error');
            SecureTokenManager.clearTokens();
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  private isAuthEndpoint(url?: string): boolean {
    if (!url) return false;
    return url.includes('/api/auth/login') ||
           url.includes('/api/auth/register') ||
           url.includes('/api/auth/refresh-token') ||
           url.includes('/api/auth/confirm-email') ||
           url.includes('/api/auth/forgot-password') ||
           url.includes('/api/auth/reset-password');
  }

  // Métodos HTTP SIMPLIFICADOS - retornam diretamente response.data
  public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  public async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
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

  public getRawClient(): AxiosInstance {
    return this.client;
  }
}

const apiClient = new ApiClient();

// LOG: Quando o client carrega
if (import.meta.env.DEV) {
  logClient('ApiClient carregado e simplificado - sem extractResponseData');
}

export default apiClient;
export { ApiClient, SecureTokenManager, ClientRateLimit };
export type { 
  TokenResponse, 
  UserProfile, 
  ApiError
};