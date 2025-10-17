// auth.service.ts - Serviço de autenticação alinhado com BD
import apiClient from './client';
import { auth as logger } from '../utils/logger';
import type { TokenResponse, UserProfile } from './client';

// Request interfaces para autenticação
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  acceptTerms: boolean;
  newsletter?: boolean;
}

interface ForgotPasswordRequest {
  email: string;
}

interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

interface ConfirmEmailRequest {
  token: string;
}

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UpdateProfileRequest {
  fullName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

// Response interfaces alinhadas com o servidor
interface AuthResult {
  success: boolean;
  message?: string;
  errors?: string[];
  token?: TokenResponse;
  user?: UserProfile;
}

interface ConfirmEmailResponse {
  success: boolean;
  message: string;
}

interface PasswordResetResponse {
  success: boolean;
  message: string;
}

// Interfaces para os payloads (usadas no AuthModal)
export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

// Utility functions
export const authUtils = {
  clearTokens: () => {
    apiClient.clearAuthTokens();
  },
  
  isAuthenticated: () => {
    return apiClient.isAuthenticated();
  },
  
  getCurrentUser: () => {
    return apiClient.getCurrentUser();
  },
  
  getSessionId: () => {
    return apiClient.getSessionId();
  }
};

/**
 * Função simples para extrair erro
 */
function getErrorMessage(error: unknown): string {
  const errorObj = error as { response?: { data?: { message?: string; errors?: string[] | Record<string, string[]> } } };
  
  // 1. Se tem response.data.message (objeto simples)
  if (errorObj.response?.data?.message) {
    return errorObj.response.data.message;
  }
  
  // 2. Se tem response.data.errors (array ou objeto)
  if (errorObj.response?.data?.errors) {
    const errors = errorObj.response.data.errors;
    if (Array.isArray(errors)) {
      return errors.join('. ');
    }
    if (typeof errors === 'object') {
      const errorMessages: string[] = [];
      for (const key in errors) {
        const value = errors[key];
        if (Array.isArray(value)) {
          errorMessages.push(...value);
        }
      }
      return errorMessages.join('. ');
    }
  }
  
  // 3. Fallback
  return 'Erro interno do servidor';
}

/**
 * Login do utilizador
 */
export async function login(credentials: LoginPayload): Promise<AuthResult> {
  try {
    const requestData: LoginRequest = {
      email: credentials.email,
      password: credentials.password,
      rememberMe: credentials.rememberMe
    };

    const response = await apiClient.post<AuthResult>('/api/auth/login', requestData);

    // Salvar tokens automaticamente se login foi bem-sucedido
    if (response.success && response.token && response.user) {
      apiClient.saveAuthTokens(response.token, response.user);
    }
     
    return response;
  } catch (error: unknown) {
    logger.error('Erro no login', error as Error);
    
    return {
      success: false,
      message: getErrorMessage(error),
      errors: [getErrorMessage(error)]
    };
  }
}

/**
 * Registo de novo utilizador
 */
export async function register(userData: RegisterPayload): Promise<AuthResult> {
  try {
    const requestData: RegisterRequest = {
      email: userData.email,
      password: userData.password,
      confirmPassword: userData.confirmPassword,
      fullName: userData.fullName,
      acceptTerms: userData.acceptTerms,
      newsletter: false
    };

    const response = await apiClient.post<AuthResult>('/api/auth/register', requestData);
    
    // Apenas salvar tokens se o registro incluiu login automático (ex: OAuth)
    // Registro normal NÃO retorna tokens - utilizador deve confirmar email primeiro
    if (response.success && response.token && response.token.accessToken && response.user) {
      logger.info('Registro com login automático - salvando tokens');
      apiClient.saveAuthTokens(response.token, response.user);
    } else if (response.success) {
      logger.info('Registro bem-sucedido - aguardando confirmação de email');
    }
    
    return response;
  } catch (error) {
    logger.error('Erro no registro', error as Error);
    
    return {
      success: false,
      message: getErrorMessage(error),
      errors: [getErrorMessage(error)]
    };
  }
}

/**
 * Logout do utilizador
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/auth/logout');
  } catch  {
    // Log do erro mas não falha o logout
    logger.warn('Erro no logout no servidor');
  } finally {
    // Sempre limpar tokens localmente
    apiClient.clearAuthTokens();
  }
}

/**
 * Obter usuário atual (com dados atualizados do servidor)
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  try {
    if (!apiClient.isAuthenticated()) {
      return null;
    }
    
    const user = await apiClient.get<UserProfile>('/api/auth/profile');
    
    // Atualizar user no localStorage se mudou
    const currentUser = apiClient.getCurrentUser();
    if (currentUser && user) {
      // Manter os tokens, so atualizar dados do utilizador
      const fakeToken: TokenResponse = {
        accessToken: 'current',
        refreshToken: 'current', 
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        tokenType: 'Bearer'
      };
      apiClient.saveAuthTokens(fakeToken, user);
    }
    
    return user;
  } catch (error) {
    logger.error('Erro ao obter usuário atual', error as Error);
    return null;
  }
}

/**
 * Refresh do token de acesso
 */
export async function refreshToken(): Promise<TokenResponse | null> {
  try {
    const response = await apiClient.post<{ message: string; token: TokenResponse }>('/api/auth/refresh-token');
    
    const user = apiClient.getCurrentUser();
    if (response.token && user) {
      apiClient.saveAuthTokens(response.token, user);
    }
    
    return response.token;
  } catch (error) {
    logger.error('Erro ao renovar token', error as Error);
    apiClient.clearAuthTokens();
    return null;
  }
}

/**
 * Confirmar email
 */
export async function confirmEmail(data: ConfirmEmailRequest): Promise<ConfirmEmailResponse> {
  try {
    // Token já vem URL-safe do backend (Base64UrlEncode), não precisa encode adicional
    const response = await apiClient.get<ConfirmEmailResponse>(
      `/api/auth/confirm-email/${data.token}`
    );
    return response;
  } catch (error) {
    logger.error('Erro ao confirmar email', error as Error);
    throw error;
  }
}

/**
 * Solicitar redefinição de senha
 */
export async function forgotPassword(data: ForgotPasswordRequest): Promise<PasswordResetResponse> {
  return await apiClient.post<PasswordResetResponse>('/api/auth/forgot-password', data);
}

/**
 * Reenviar email de confirmação
 */
export async function resendConfirmationEmail(email: string): Promise<{ message: string }> {
  try {
    const response = await apiClient.post<{ message: string }>('/api/auth/resend-confirmation', { email });
    return response;
  } catch (error) {
    logger.error('Erro ao reenviar email de confirmação', error as Error);
    throw error;
  }
}

/**
 * Redefinir senha
 */
export async function resetPassword(data: ResetPasswordRequest): Promise<PasswordResetResponse> {
  return await apiClient.post<PasswordResetResponse>('/api/auth/reset-password', data);
}

/**
 * Alterar senha (utilizador logado)
 */
export async function changePassword(data: ChangePasswordRequest): Promise<PasswordResetResponse> {
  return await apiClient.post<PasswordResetResponse>('/api/auth/change-password', data);
}

/**
 * Login com Google
 */
export async function googleLogin(credential: string): Promise<AuthResult> {
  try {
    const requestData = {
      accessToken: credential,
      provider: 'Google'
    };

    const response = await apiClient.post<AuthResult>('/api/auth/google-login', requestData);

    // Salvar tokens automaticamente se login foi bem-sucedido
    if (response.success && response.token && response.user) {
      apiClient.saveAuthTokens(response.token, response.user);
    }
     
    return response;
  } catch (error: unknown) {
    logger.error('Erro no login com Google', error as Error);
    
    return {
      success: false,
      message: getErrorMessage(error),
      errors: [getErrorMessage(error)]
    };
  }
}

/**
 * Atualizar perfil do utilizador
 */
export async function updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
  const updatedUser = await apiClient.put<UserProfile>('/api/auth/profile', data);
  
  // Atualizar dados locais
  const currentUser = apiClient.getCurrentUser();
  if (currentUser) {
    const fakeToken: TokenResponse = {
      accessToken: 'current',
      refreshToken: 'current',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      tokenType: 'Bearer'
    };
    apiClient.saveAuthTokens(fakeToken, updatedUser);
  }
  
  return updatedUser;
}

/**
 * Obter sessões ativas do utilizador
 */
export async function getActiveSessions(): Promise<Array<{
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  lastActivity: string;
  isCurrentSession: boolean;
}>> {
  return await apiClient.get<Array<{
    id: string;
    deviceInfo: string | null;
    ipAddress: string | null;
    lastActivity: string;
    isCurrentSession: boolean;
  }>>('/api/auth/sessions');
}

/**
 * Revogar sessão específica
 */
export async function revokeSession(sessionId: string): Promise<{ success: boolean; message: string }> {
  return await apiClient.delete<{ success: boolean; message: string }>(`/api/auth/sessions/${sessionId}`);
}

/**
 * Revogar todas as outras sessões (manter apenas a atual)
 */
export async function revokeAllOtherSessions(): Promise<{ success: boolean; message: string; revokedCount: number }> {
  return await apiClient.post<{ success: boolean; message: string; revokedCount: number }>('/api/auth/revoke-all-sessions');
}

/**
 * Excluir conta do utilizador
 */
export async function deleteAccount(password: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete<{ success: boolean; message: string }>('/api/auth/account', {
    data: { password }
  });
  
  // Limpar tokens após exclusão
  if (response.success) {
    apiClient.clearAuthTokens();
  }
  
  return response;
}

// Log quando o serviço carrega
logger.info('Serviço de autenticação carregado e atualizado');logger.info('Serviço de autenticação carregado e atualizado');