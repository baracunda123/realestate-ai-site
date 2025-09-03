// client.ts -  client 
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

// Classe para gerenciamento SEGURO de tokens
class SecureTokenManager {
  private static readonly SESSION_KEY = 'realestate_session_id';
  private static readonly TOKEN_EXPIRY_KEY = 'token_expiry';
  private static readonly USER_KEY = 'user_profile';
  
  private static accessTokenMemory: string | null = null;
  private static tokenExpiryMemory: Date | null = null;
  private static sessionId: string | null = null;
  private static isRefreshing = false; // Proteção contra múltiplas renovações

  static initialize(): void {
    this.sessionId = localStorage.getItem(this.SESSION_KEY) || uuidv4();
    localStorage.setItem(this.SESSION_KEY, this.sessionId);
  }

  static saveTokens(tokenResponse: TokenResponse, user: UserProfile): void {
    // Validação rigorosa
    if (!tokenResponse?.accessToken || !tokenResponse?.expiresAt || !user?.id) {
      console.warn('Dados de token inválidos');
      return;
    }

    const expiryDate = new Date(tokenResponse.expiresAt);
    if (expiryDate <= new Date()) {
      console.warn('Token já expirado');
      return;
    }

    this.accessTokenMemory = tokenResponse.accessToken;
    this.tokenExpiryMemory = expiryDate;
    
    try {
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, tokenResponse.expiresAt);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.warn('Erro ao salvar no localStorage:', error);
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
    
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    
    return new Date() >= new Date(new Date(expiry).getTime() - 30000);
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
      localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.warn('Erro ao limpar localStorage:', error);
    }
  }

  static updateAccessToken(newToken: string, expiresAt: string): void {
    const expiryDate = new Date(expiresAt);
    if (expiryDate <= new Date()) return;

    this.accessTokenMemory = newToken;
    this.tokenExpiryMemory = expiryDate;
    
    try {
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiresAt);
    } catch (error) {
      console.warn('Erro ao atualizar localStorage:', error);
    }
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
    } catch (error) {
      console.warn('Erro ao regenerar sessão:', error);
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
    SecureTokenManager.setRefreshing(true);
    
    const refreshClient = axios.create({
      withCredentials: true,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const response = await refreshClient.post<{ token: TokenResponse }>('/api/auth/refresh-token');
    return response.data.token;
  } catch {
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
      timeout: 30000, // 30 segundos timeout
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
        
        // Para endpoints protegidos, token é OBRIGATÓRIO
        if (!this.isAuthEndpoint(config.url)) {
          const accessToken = SecureTokenManager.getAccessToken();
          
          if (!accessToken) {
            // Sem token para endpoint protegido = redirecionar
            console.warn('Token necessário para endpoint protegido:', config.url);
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(new Error('Autenticação necessária'));
          }
          
          config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Não tentar renovação em endpoints de auth
        if (this.isAuthEndpoint(originalRequest.url)) {
          return Promise.reject(error);
        }
        
        // Para endpoints protegidos: sempre tentar renovação em 401
        if (error.response?.status === 401 && 
            !originalRequest._retry && 
            !SecureTokenManager.getIsRefreshing()) {
          
          originalRequest._retry = true;
          
          try {
            const newTokens = await refreshAccessToken();
            const user = SecureTokenManager.getCurrentUser();
            
            if (newTokens && user) {
              SecureTokenManager.updateAccessToken(newTokens.accessToken, newTokens.expiresAt);
              originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
              return this.client(originalRequest);
            }
          } catch {
            SecureTokenManager.clearTokens();
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
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
           url.includes('/api/auth/refresh-token');
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

export default apiClient;
export { ApiClient, SecureTokenManager };
export type { TokenResponse, UserProfile };