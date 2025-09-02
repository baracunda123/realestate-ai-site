// auth.service.ts - Versão segura contra XSS
import axios from 'axios';

const API_URL = '/api/auth';

// Interfaces (mantém as existentes)
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  tokenType: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  credits: number;
  subscription?: string;
  createdAt: string;
}

export interface AuthResult {
  success: boolean;
  message?: string;
  errors?: string[];
  token?: TokenResponse;
  user?: UserProfile;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  userId?: string;
  errors?: string[];
}

// Classe para gerenciamento SEGURO de tokens
class SecureTokenManager {
  private static readonly ACCESS_TOKEN_KEY = 'access_token';
  private static readonly TOKEN_EXPIRY_KEY = 'token_expiry';
  private static readonly USER_KEY = 'user_profile';
  
  // Armazenamento em memória para access token (mais seguro)
  private static accessTokenMemory: string | null = null;
  private static tokenExpiryMemory: Date | null = null;

  // Salvar tokens de forma híbrida
  static saveTokens(tokenResponse: TokenResponse, user: UserProfile): void {
    // Access token em memória (perdido ao recarregar página)
    this.accessTokenMemory = tokenResponse.accessToken;
    this.tokenExpiryMemory = new Date(tokenResponse.expiresAt);
    
    // Dados não-sensíveis no localStorage
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, tokenResponse.expiresAt);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    
    // Refresh token será enviado como HttpOnly cookie pelo backend
    // (não acessível via JavaScript - proteção contra XSS)
  }

  // Obter access token da memória
  static getAccessToken(): string | null {
    // Primeiro tenta da memória
    if (this.accessTokenMemory && !this.isTokenExpiredMemory()) {
      return this.accessTokenMemory;
    }
    
    // Se não tem em memória ou expirou, retorna null
    // O interceptor tentará renovar automaticamente
    return null;
  }

  // Verificar expiração na memória
  private static isTokenExpiredMemory(): boolean {
    if (!this.tokenExpiryMemory) return true;
    return new Date() >= this.tokenExpiryMemory;
  }

  // Verificar se token está expirado (localStorage como fallback)
  static isTokenExpired(): boolean {
    // Primeiro verifica memória
    if (this.tokenExpiryMemory) {
      return this.isTokenExpiredMemory();
    }
    
    // Fallback para localStorage
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    
    return new Date() >= new Date(expiry);
  }

  // Obter usuário atual
  static getCurrentUser(): UserProfile | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  // Limpar todos os tokens
  static clearTokens(): void {
    // Limpar memória
    this.accessTokenMemory = null;
    this.tokenExpiryMemory = null;
    
    // Limpar localStorage
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  // Atualizar access token na memória
  static updateAccessToken(newToken: string, expiresAt: string): void {
    this.accessTokenMemory = newToken;
    this.tokenExpiryMemory = new Date(expiresAt);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiresAt);
  }

  // Verificar se usuário está logado
  static isAuthenticated(): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // Se tem token em memória e não expirou
    if (this.accessTokenMemory && !this.isTokenExpiredMemory()) {
      return true;
    }
    
    // Se não tem token em memória, mas tem dados de usuário,
    // assume que pode renovar via refresh token (cookie HttpOnly)
    return !this.isTokenExpired();
  }
}

// Configurar Axios para incluir cookies
axios.defaults.withCredentials = true;

// Interceptor para adicionar token automaticamente
axios.interceptors.request.use((config) => {
  const token = SecureTokenManager.getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para renovação automática de tokens
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Tentar renovar token (refresh token vem do cookie HttpOnly)
        const newTokens = await refreshAccessToken();
        const user = SecureTokenManager.getCurrentUser();
        
        if (newTokens && user) {
          SecureTokenManager.updateAccessToken(newTokens.accessToken, newTokens.expiresAt);
          
          // Refazer requisição com novo token
          originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
          return axios(originalRequest);
        }
      } catch (refreshError) {
        // Refresh falhou, fazer logout
        SecureTokenManager.clearTokens();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// Funções da API
export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const response = await axios.post<RegisterResponse>(`${API_URL}/register`, payload);
  return response.data;
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const response = await axios.post<AuthResult>(`${API_URL}/login`, payload);
  
  // Salvar tokens se login bem-sucedido
  if (response.data.success && response.data.token && response.data.user) {
    SecureTokenManager.saveTokens(response.data.token, response.data.user);
  }
  
  return response.data;
}

// Renovar token (não precisa passar refresh token, vem do cookie)
export async function refreshAccessToken(): Promise<TokenResponse | null> {
  try {
    const response = await axios.post<{ token: TokenResponse }>(`${API_URL}/refresh-token`);
    return response.data.token;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await axios.post(`${API_URL}/logout`);
  } finally {
    SecureTokenManager.clearTokens();
  }
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const cachedUser = SecureTokenManager.getCurrentUser();
  if (cachedUser && SecureTokenManager.isAuthenticated()) {
    return cachedUser;
  }

  try {
    const response = await axios.get<UserProfile>(`${API_URL}/profile`);
    
    if response.data {
      localStorage.setItem('user_profile', JSON.stringify(response.data));
    }
    
    return response.data;
  } catch {
    return null;
  }
}

export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string; errors?: string[] }> {
  const response = await axios.post(`${API_URL}/change-password`, {
    currentPassword,
    newPassword,
    confirmPassword
  });
  return response.data;
}

// Funções utilitárias exportadas
export const authUtils = {
  isAuthenticated: SecureTokenManager.isAuthenticated,
  getCurrentUser: SecureTokenManager.getCurrentUser,
  getAccessToken: SecureTokenManager.getAccessToken,
  isTokenExpired: SecureTokenManager.isTokenExpired,
  clearTokens: SecureTokenManager.clearTokens
};