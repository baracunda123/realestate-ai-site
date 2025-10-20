// client.ts - API Client
import axios from 'axios';
import { client as logger } from '../utils/logger';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Base URL único para toda a aplicação
const API_BASE_URL: string = (() => {
  try {
    const raw = import.meta.env.VITE_API_URL || '';
    if (raw && typeof raw === 'string' && raw.trim().length > 0) {
      const normalized = raw.trim().replace(/\/$/, '');
      logger.info(`API_BASE_URL definido: ${normalized}`);
      return normalized;
    }
  } catch {
    // ignore
  }
  logger.warn('API_BASE_URL não definido via VITE_API_URL – usando origem atual');
  return '';
})();

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
  credits?: string;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface ApiError {
  success: false;
  message: string;
  errors?: string[];
  code?: string;
  statusCode?: number;
}

// Classe para gerenciamento SEGURO de tokens
class SecureTokenManager {
  private static readonly SESSION_KEY = 'realestate_session_id';
  private static readonly USER_KEY = 'user_profile';
  private static readonly AUTH_STATE_KEY = 'auth_state';
  
  private static accessTokenMemory: string | null = null;
  private static tokenExpiryMemory: Date | null = null;
  private static sessionId: string | null = null;

  static initialize(): void {
    this.sessionId = localStorage.getItem(this.SESSION_KEY) || uuidv4();
    localStorage.setItem(this.SESSION_KEY, this.sessionId);
    
    logger.info(`Session inicializada: ${this.sessionId.substring(0, 8)}...`);
  }

  static saveTokens(tokenResponse: TokenResponse, user: UserProfile): void {
    if (!tokenResponse?.accessToken || !tokenResponse?.expiresAt || !user?.id) {
      logger.warn('Dados de token inválidos fornecidos');
      return;
    }

    const expiryDate = new Date(tokenResponse.expiresAt);
    if (expiryDate <= new Date()) {
      logger.warn('Token já expirado');
      return;
    }

    // Access token APENAS em memória
    this.accessTokenMemory = tokenResponse.accessToken;
    this.tokenExpiryMemory = expiryDate;
    
    // Refresh token é gerenciado pelo servidor via cookie HttpOnly
    
    try {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      localStorage.setItem(this.AUTH_STATE_KEY, 'authenticated');
      logger.info(`Tokens salvos para: ${user.email}`);
    } catch  {
      logger.error('Erro ao salvar dados do usuário');
    }
  }

  static getAccessToken(): string | null {
    if (this.accessTokenMemory && !this.isTokenExpiredMemory()) {
      return this.accessTokenMemory;
    }
    return null;
  }

  static getRefreshToken(): string | null {
    try {
      const userStr = localStorage.getItem(this.USER_KEY);
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      return user.refreshToken || null;
    } catch {
      return null;
    }
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
      
      if (!user.id || !user.email) {
        logger.warn('Dados de usuário inválidos no storage');
        this.clearTokens();
        return null;
      }
      
      return user;
    } catch {
      logger.warn('Erro ao analisar dados do usuário');
      this.clearTokens();
      return null;
    }
  }

  static clearTokens(): void {
    this.accessTokenMemory = null;
    this.tokenExpiryMemory = null;
    
    try {
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem(this.AUTH_STATE_KEY);
      logger.info('Tokens limpos');
    } catch {
      logger.warn('Erro ao limpar localStorage');
    }
  }

  static updateAccessToken(newToken: string, expiresAt: string): void {
    const expiryDate = new Date(expiresAt);
    if (expiryDate <= new Date()) {
      logger.warn('Token renovado já está expirado');
      return;
    }

    this.accessTokenMemory = newToken;
    this.tokenExpiryMemory = expiryDate;
    
    try {
      localStorage.setItem(this.AUTH_STATE_KEY, 'authenticated');
      logger.info('Access token atualizado via header do servidor');
    } catch {
      logger.warn('Erro ao atualizar estado de auth');
    }
  }

  static isAuthenticated(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // Se tem token válido em memória
    if (this.accessTokenMemory && !this.isTokenExpiredMemory()) {
      return true;
    }
    
    // Se tem user mas sem token, ainda considera autenticado
    // O servidor vai renovar automaticamente via cookie no próximo request
    const authState = localStorage.getItem(this.AUTH_STATE_KEY);
    return authState === 'authenticated';
  }

  static regenerateSession(): string {
    this.sessionId = uuidv4();
    try {
      localStorage.setItem(this.SESSION_KEY, this.sessionId);
      logger.info('Nova sessão gerada');
    } catch {
      logger.warn('Erro ao regenerar sessão');
    }
    return this.sessionId;
  }
}

class ClientRateLimit {
  private static requests = new Map<string, { count: number; resetTime: number }>();

  static checkLimit(endpoint: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const existing = this.requests.get(endpoint);

    if (!existing || now > existing.resetTime) {
      this.requests.set(endpoint, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (existing.count >= maxRequests) {
      logger.warn(`⚠️ Rate limit excedido para ${endpoint}: ${existing.count}/${maxRequests}`);
      return false;
    }

    existing.count++;
    return true;
  }

  static reset(): void {
    this.requests.clear();
    logger.info('Rate limit cache limpo');
  }
}

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    SecureTokenManager.initialize();
    this.client = axios.create({
      baseURL: baseURL,
      withCredentials: true, // Importante: envia cookies HttpOnly
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      async (config) => {
        // Rate limiting (100 requests/min)
        if (config.url && !ClientRateLimit.checkLimit(config.url, 100, 60000)) {
          throw new Error('⚠️ Muitas requisições - aguarde alguns segundos');
        }

        // Sempre adicionar Session ID
        config.headers['X-Session-ID'] = SecureTokenManager.getSessionId();
        
        // Para endpoints protegidos, adicionar token se disponível
        if (!this.isAuthEndpoint(config.url)) {
          const accessToken = SecureTokenManager.getAccessToken();
          
          if (accessToken) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
            logger.info(`Requisição autenticada: ${config.method?.toUpperCase()} ${config.url}`);
          } else {
            logger.info(`Requisição sem token (servidor vai renovar via cookie): ${config.method?.toUpperCase()} ${config.url}`);
          }
        } else {
          logger.info(`Requisição de auth: ${config.method?.toUpperCase()} ${config.url}`);
        }
        
        return config;
      },
      (error) => {
        logger.error(`Erro no interceptor de requisição: ${error.message}`);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.info(`Resposta SUCESSO: ${response.status} - ${response.config?.method?.toUpperCase()} ${response.config?.url}`);
        
        // IMPORTANTE: Verificar se o servidor renovou o token
        const newAccessToken = response.headers['x-new-access-token'];
        const tokenExpiresAt = response.headers['x-token-expires-at'];
        
        if (newAccessToken && tokenExpiresAt) {
          logger.info('🔄 Servidor renovou o token automaticamente via cookie');
          SecureTokenManager.updateAccessToken(newAccessToken, tokenExpiresAt);
        }
        
        return response;
      },
      async (error) => {
        const originalRequest = error.config;
        
        logger.error(`INTERCEPTOR ERRO: Status ${error.response?.status || 'SEM_STATUS'}`);
        
        // ⭐ NOVO: Se 401 e não é um retry, tentar renovar via refreshToken do localStorage
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          const refreshToken = SecureTokenManager.getRefreshToken();
          
          if (refreshToken && !this.isAuthEndpoint(originalRequest.url)) {
            logger.info('🔄 Tentando renovar token via refreshToken do localStorage (fallback mobile)');
            
            try {
              // Chamar o endpoint de refresh com o refreshToken no body
              const response = await this.client.post<{ message: string; token: TokenResponse }>('/api/auth/refresh-token', {
                refreshToken: refreshToken
              });
              
              if (response.data.token) {
                logger.info('✅ Token renovado com sucesso via fallback!');
                
                const currentUser = SecureTokenManager.getCurrentUser();
                if (currentUser) {
                  SecureTokenManager.saveTokens(response.data.token, currentUser);
                }
                
                // Repetir o request original com o novo token
                originalRequest.headers['Authorization'] = `Bearer ${response.data.token.accessToken}`;
                return this.client(originalRequest);
              }
            } catch (refreshError) {
              logger.error('❌ Falha ao renovar token via fallback', refreshError as Error);
              SecureTokenManager.clearTokens();
              return Promise.reject(refreshError);
            }
          } else {
            logger.warn('Erro 401 - sem refreshToken disponível, limpando tokens');
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
           url.includes('/api/auth/reset-password') ||
           url.includes('/api/auth/google-login');
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
    ClientRateLimit.reset();
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

// Reset rate limit on page visibility change (tab switch/focus)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      ClientRateLimit.reset();
    }
  });
}

logger.info('ApiClient carregado');

export default apiClient;
export { ApiClient, SecureTokenManager, ClientRateLimit };
export type { 
  TokenResponse, 
  UserProfile, 
  ApiError
};