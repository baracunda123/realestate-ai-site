// client.ts - API Client
import axios from 'axios';
import { client as logger } from '../utils/logger';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Base URL único para toda a aplicação (evita cair para a origem do Static Web Apps)
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
  logger.warn('API_BASE_URL não definido via VITE_API_URL – usando origem atual (pode quebrar refresh-token em produção)');
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
  private static readonly LAST_REFRESH_KEY = 'last_refresh_attempt';
  private static readonly REFRESH_COUNT_KEY = 'refresh_count';
  private static readonly MAX_REFRESH_ATTEMPTS = 3;
  
  private static accessTokenMemory: string | null = null;
  private static tokenExpiryMemory: Date | null = null;
  private static sessionId: string | null = null;
  private static isRefreshing = false;
  private static refreshPromise: Promise<TokenResponse | null> | null = null;

  static initialize(): void {
    this.sessionId = localStorage.getItem(this.SESSION_KEY) || uuidv4();
    localStorage.setItem(this.SESSION_KEY, this.sessionId);
    
    // Reset refresh count on page load
    const refreshCount = parseInt(localStorage.getItem(this.REFRESH_COUNT_KEY) || '0');
    if (refreshCount > 0) {
      logger.info(`Resetando contador de refresh: ${refreshCount} -> 0`);
      localStorage.setItem(this.REFRESH_COUNT_KEY, '0');
    }
    
    logger.info(`Session inicializada: ${this.sessionId.substring(0, 8)}...`);
    
    const authState = localStorage.getItem(this.AUTH_STATE_KEY);
    if (authState === 'authenticated' && !this.accessTokenMemory) {
      logger.info('🔄 Estado autenticado sem token - iniciando auto-refresh');
      
      // Auto-refresh após page refresh
      // Pequeno delay para garantir que o DOM está pronto
      setTimeout(() => {
        this.attemptAutoRefresh();
      }, 100);
    }
  }

  static saveTokens(tokenResponse: TokenResponse, user: UserProfile): void {
    // Validação básica apenas
    if (!tokenResponse?.accessToken || !tokenResponse?.expiresAt || !user?.id) {
      logger.warn('Dados de token inválidos fornecidos');
      return;
    }

    const expiryDate = new Date(tokenResponse.expiresAt);
    if (expiryDate <= new Date()) {
      logger.warn('Token já expirado');
      return;
    }

    // APENAS EM MEMÓRIA para o access token
    this.accessTokenMemory = tokenResponse.accessToken;
    this.tokenExpiryMemory = expiryDate;
    
    try {
      // Salvar dados do usuário (não sensíveis) no localStorage
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      // Store auth state to detect refresh scenarios
      localStorage.setItem(this.AUTH_STATE_KEY, 'authenticated');
      // Clear any failed refresh attempts
      localStorage.removeItem(this.LAST_REFRESH_KEY);
      localStorage.setItem(this.REFRESH_COUNT_KEY, '0'); // Reset counter on successful auth
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
    this.isRefreshing = false;
    this.refreshPromise = null;
    
    try {
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem(this.AUTH_STATE_KEY);
      localStorage.removeItem(this.LAST_REFRESH_KEY);
      localStorage.removeItem(this.REFRESH_COUNT_KEY);
      logger.info('Tokens limpos');
    } catch {
        logger.warn('Erro ao limpar localStorage');
    }
  }

  static updateAccessToken(newToken: string, expiresAt: string): void {
    const expiryDate = new Date(expiresAt);
    if (expiryDate <= new Date()) return;

    this.accessTokenMemory = newToken;
    this.tokenExpiryMemory = expiryDate;
    
    // Update auth state
    try {
      localStorage.setItem(this.AUTH_STATE_KEY, 'authenticated');
      localStorage.removeItem(this.LAST_REFRESH_KEY);
      localStorage.setItem(this.REFRESH_COUNT_KEY, '0'); // Reset on successful refresh
      logger.info('Token atualizado');
    } catch {
      logger.warn('Erro ao atualizar estado de auth');
    }
  }

  static canAttemptRefresh(): boolean {
    const refreshCount = parseInt(localStorage.getItem(this.REFRESH_COUNT_KEY) || '0');
    const lastRefreshAttempt = localStorage.getItem(this.LAST_REFRESH_KEY);
    
    if (refreshCount >= this.MAX_REFRESH_ATTEMPTS) {
      logger.warn(`Limite de tentativas de refresh atingido: ${refreshCount}`);
      return false;
    }
    
    if (lastRefreshAttempt) {
      const lastAttemptTime = new Date(lastRefreshAttempt);
      const now = new Date();
      const timeDiff = now.getTime() - lastAttemptTime.getTime();
      
      // If less than 2 minutes since last failed attempt, don't retry
      if (timeDiff < 2 * 60 * 1000) {
        logger.warn(`Aguardando cooldown de refresh: ${Math.ceil((2 * 60 * 1000 - timeDiff) / 1000)}s restantes`);
        return false;
      }
    }
    
    return true;
  }

  static isAuthenticated(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // If we have a valid token in memory, we're authenticated
    if (this.accessTokenMemory && !this.isTokenExpiredMemory()) {
      return true;
    }
    
    // Check if we have auth state - this means we should try to refresh
    // APENAS permitir se temos um token válido OU se podemos tentar refresh
    const authState = localStorage.getItem(this.AUTH_STATE_KEY);
    if (authState === 'authenticated' && this.accessTokenMemory === null) {
      // Temos estado autenticado mas nenhum token - verificar se podemos tentar refresh
      if (this.canAttemptRefresh()) {
        logger.info('Estado autenticado sem token - válido para tentativa de refresh');
        return true;
      } else {
        logger.warn('Estado autenticado sem token e sem possibilidade de refresh - considerado não autenticado');
        return false;
      }
    }
    
    return false;
  }

  static incrementRefreshCount(): void {
    const currentCount = parseInt(localStorage.getItem(this.REFRESH_COUNT_KEY) || '0');
    const newCount = currentCount + 1;
    localStorage.setItem(this.REFRESH_COUNT_KEY, newCount.toString());
    logger.info(`Contador de refresh incrementado: ${newCount}/${this.MAX_REFRESH_ATTEMPTS}`);
  }

  static markRefreshFailed(): void {
    try {
      localStorage.setItem(this.LAST_REFRESH_KEY, new Date().toISOString());
      this.incrementRefreshCount();
      
      const refreshCount = parseInt(localStorage.getItem(this.REFRESH_COUNT_KEY) || '0');
      if (refreshCount >= this.MAX_REFRESH_ATTEMPTS) {
        logger.error('Limite de tentativas atingido - limpando estado de auth');
        localStorage.removeItem(this.AUTH_STATE_KEY);
      }
      
      logger.info('Marcada falha no refresh de token');
    } catch {
      logger.warn('Erro ao marcar falha no refresh');
    }
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

  static setRefreshing(value: boolean): void {
    this.isRefreshing = value;
    if (!value) {
      this.refreshPromise = null;
    }
  }

  static getIsRefreshing(): boolean {
    return this.isRefreshing;
  }

  static getRefreshPromise(): Promise<TokenResponse | null> | null {
    return this.refreshPromise;
  }

  static setRefreshPromise(promise: Promise<TokenResponse | null>): void {
    this.refreshPromise = promise;
  }

  // Auto-refresh silencioso na inicialização
  private static async attemptAutoRefresh(): Promise<void> {
    if (!this.canAttemptRefresh()) {
      logger.warn('Auto-refresh não permitido - limite atingido ou cooldown');
      this.clearTokens();
      return;
    }
    
    const user = this.getCurrentUser();
    if (!user) {
      logger.warn('Auto-refresh cancelado - sem usuário');
      this.clearTokens();
      return;
    }
    
    logger.info('Iniciando auto-refresh silencioso...');
    
    try {
      const newTokens = await refreshAccessToken();
      
      if (newTokens?.accessToken) {
        this.updateAccessToken(newTokens.accessToken, newTokens.expiresAt);
        logger.info('Auto-refresh bem-sucedido - sessão restaurada');
      } else {
        logger.warn('Auto-refresh falhou - resposta inválida');
        this.clearTokens();
      }
    } catch (error) {
      logger.error('Erro no auto-refresh', error as Error);
      this.markRefreshFailed();
    }
  }
}

// Rate limiting mais rigoroso
class ClientRateLimit {
  private static requests = new Map<string, { count: number; resetTime: number }>();

  static checkLimit(endpoint: string, maxRequests: number = 30, windowMs: number = 60000): boolean {
    const now = Date.now();
    const existing = this.requests.get(endpoint);

    if (!existing || now > existing.resetTime) {
      this.requests.set(endpoint, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (existing.count >= maxRequests) {
      logger.warn(`Rate limit excedido para ${endpoint}: ${existing.count}/${maxRequests}`);
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

async function refreshAccessToken(): Promise<TokenResponse | null> {
  if (SecureTokenManager.getIsRefreshing()) {
    // If already refreshing, return the existing promise
    const existingPromise = SecureTokenManager.getRefreshPromise();
    if (existingPromise) {
      logger.info('Aguardando refresh em progresso...');
      return existingPromise;
    }
  }

  if (!SecureTokenManager.canAttemptRefresh()) {
    logger.error('Refresh não permitido - limite atingido ou cooldown ativo');
    return null;
  }

  try {
    const baseURL = API_BASE_URL;
    if (!baseURL) {
      logger.warn('Refresh de token sem API_BASE_URL – a requisição pode ir para a origem incorreta. Defina VITE_API_URL.');
    } else {
      logger.info(`Tentando renovar token silenciosamente em: ${baseURL}/api/auth/refresh-token`);
    }

    SecureTokenManager.setRefreshing(true);
    
    const refreshClient = axios.create({
      baseURL, // garante que o refresh vá para a API correta em produção
      withCredentials: true,
      timeout: 10000, // Reduced timeout
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-Session-ID': SecureTokenManager.getSessionId()
      }
    });
    
    const refreshPromise = refreshClient.post<{ message: string; token: TokenResponse }>('/api/auth/refresh-token')
      .then(response => {
        if (response.data && response.data.token) {
          logger.info('Token renovado silenciosamente');
          return response.data.token;
        } else {
          logger.warn('Resposta de renovação inválida');
          return null;
        }
      })
      .catch(error => {
        logger.error('Falha na renovação do token',error);
        SecureTokenManager.markRefreshFailed();
        return null;
      });
    
    SecureTokenManager.setRefreshPromise(refreshPromise);
    return await refreshPromise;
  } finally {
    SecureTokenManager.setRefreshing(false);
  }
}

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    SecureTokenManager.initialize();
    this.client = axios.create({
      baseURL: baseURL,
      withCredentials: true,
      timeout: 15000, // Reduced timeout
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
        // Rate limiting mais rigoroso
        if (config.url && !ClientRateLimit.checkLimit(config.url, 20, 60000)) {
          throw new Error('Rate limit exceeded - please slow down');
        }

        // Sempre adicionar Session ID
        config.headers['X-Session-ID'] = SecureTokenManager.getSessionId();
        
        // Para endpoints protegidos, adicionar token se disponível
        if (!this.isAuthEndpoint(config.url)) {
          let accessToken = SecureTokenManager.getAccessToken();
          
          // Only attempt refresh if we can and should
          if (!accessToken && 
              localStorage.getItem('auth_state') === 'authenticated' && 
              SecureTokenManager.canAttemptRefresh()) {
            try {
              logger.info('Tentando refresh automático silencioso para request');
              const newTokens = await refreshAccessToken();
              const user = SecureTokenManager.getCurrentUser();
              
              if (newTokens && user) {
                SecureTokenManager.updateAccessToken(newTokens.accessToken, newTokens.expiresAt);
                accessToken = newTokens.accessToken;
                logger.info('Refresh automático silencioso bem-sucedido');
              } else {
                logger.warn('Refresh automático falhou - limpando estado');
                SecureTokenManager.clearTokens();
              }
            } catch {
              logger.warn('Falha no refresh automático');
              SecureTokenManager.clearTokens();
            }
          }
          
          if (accessToken) {
            config.headers['Authorization'] = `Bearer ${accessToken}`;
            logger.info(`Requisição autenticada: ${config.method?.toUpperCase()} ${config.url}`);
          } else {
            logger.info(`Requisição sem token: ${config.method?.toUpperCase()} ${config.url}`);
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
        return response;
      },
      async (error) => {
        logger.error(`INTERCEPTOR ERRO: Status ${error.response?.status || 'SEM_STATUS'}`);
        
        const originalRequest = error.config;
        
        // Não tentar renovação em endpoints de auth
        if (this.isAuthEndpoint(originalRequest.url)) {
          return Promise.reject(error);
        }
        
        // More restrictive 401 handling
        if (error.response?.status === 401 && 
            !originalRequest._retry && 
            !SecureTokenManager.getIsRefreshing() &&
            localStorage.getItem('auth_state') === 'authenticated' &&
            SecureTokenManager.canAttemptRefresh()) {
          
          logger.info('Erro 401 - tentando renovar token');
          originalRequest._retry = true;
          
          try {
            const newTokens = await refreshAccessToken();
            const user = SecureTokenManager.getCurrentUser();
            
            if (newTokens && user) {
              SecureTokenManager.updateAccessToken(newTokens.accessToken, newTokens.expiresAt);
              originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
              logger.info('Retry da requisição com novo token');
              return this.client(originalRequest);
            } else {
              logger.warn('Falha na renovação - limpando tokens');
              SecureTokenManager.clearTokens();
            }
          } catch  {
            logger.error('Erro na renovação - limpando tokens');
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
    ClientRateLimit.reset(); // Clear rate limit cache on logout
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

logger.info('ApiClient carregado com proteções anti-spam melhoradas');

export default apiClient;
export { ApiClient, SecureTokenManager, ClientRateLimit };
export type { 
  TokenResponse, 
  UserProfile, 
  ApiError
};