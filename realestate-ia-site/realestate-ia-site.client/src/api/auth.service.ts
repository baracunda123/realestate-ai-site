// auth.service.ts - Funções de autenticação usando ApiClient seguro
import apiClient from './client';
import type { TokenResponse, UserProfile } from './client';

// Interfaces para requisições
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

// Funções da API usando apiClient
export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return await apiClient.post<RegisterResponse>('/api/auth/register', payload);
}

export async function login(payload: LoginPayload): Promise<AuthResult> {
  const response = await apiClient.post<AuthResult>('/api/auth/login', payload);
  
  // Salvar tokens se login bem-sucedido
  if (response.success && response.token && response.user) {
    apiClient.saveAuthTokens(response.token, response.user);
  }
  
  return response;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/auth/logout');
  } finally {
    apiClient.clearAuthTokens();
  }
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const cachedUser = apiClient.getCurrentUser();
  if (cachedUser && apiClient.isAuthenticated()) {
    return cachedUser;
  }

  try {
    const userData = await apiClient.get<UserProfile>('/api/auth/profile');
    return userData;
  } catch {
    return null;
  }
}

export async function changePassword(currentPassword: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string; errors?: string[] }> {
  return await apiClient.post('/api/auth/change-password', {
    currentPassword,
    newPassword,
    confirmPassword
  });
}

// Funções utilitárias exportadas
export const authUtils = {
  isAuthenticated: () => apiClient.isAuthenticated(),
  getCurrentUser: () => apiClient.getCurrentUser(),
  clearTokens: () => apiClient.clearAuthTokens(),
  getSessionId: () => apiClient.getSessionId()
};