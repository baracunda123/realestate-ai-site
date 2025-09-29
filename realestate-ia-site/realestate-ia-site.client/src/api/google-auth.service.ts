// google-auth.service.ts - Serviço para autenticação com Google
import { googleLogin } from './auth.service';
import { client as logger } from '../utils/logger';

interface GoogleAuthResponse {
  credential: string;
  select_by: string;
}

interface GoogleCredentialPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  iat: number;
  exp: number;
}

class GoogleAuthService {
  private isInitialized = false;
  private clientId: string;

  constructor() {
    this.clientId = import.meta.env?.VITE_GOOGLE_CLIENT_ID || '';
    
    if (!this.clientId) {
      logger.warn('Google Client ID não configurado');
    } else {
      logger.info(`Google Client ID configurado: ${this.clientId.substring(0, 20)}...`);
    }
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }
    
    if (!this.clientId) {
      logger.error('Google Client ID é obrigatório');
      return false;
    }

    try {
      await this.loadGoogleScript();
      await this.initializeGoogleSignIn();
      
      this.isInitialized = true;
      logger.info('Google Auth inicializado com sucesso');
      return true;
    } catch (error) {
      logger.error('Erro ao inicializar Google Auth', error as Error);
      return false;
    }
  }

  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Falha ao carregar script do Google'));
      
      document.head.appendChild(script);
    });
  }

  private async initializeGoogleSignIn(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50;
      
      const checkGoogle = () => {
        attempts++;
        if (typeof window.google !== 'undefined' && window.google.accounts?.id) {
          resolve();
        } else if (attempts >= maxAttempts) {
          reject(new Error('Timeout aguardando API do Google'));
        } else {
          setTimeout(checkGoogle, 100);
        }
      };
      checkGoogle();
    });
  }

  // Método para renderizar botão diretamente num container
  async renderButtonIn(container: HTMLElement, onSuccess: () => void, onError: (error: string) => void): Promise<void> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        onError('Falha na inicialização do Google Auth');
        return;
      }
    }

    try {
      // Configurar callback
      window.google.accounts.id.initialize({
        client_id: this.clientId,
        callback: async (response: GoogleAuthResponse) => {
          try {
            const result = await this.handleCredentialResponse(response);
            if (result.success) {
              onSuccess();
            } else {
              onError(result.error || 'Erro no login com Google');
            }
          } catch (error) {
            logger.error('Erro no callback do Google', error as Error);
            onError('Erro interno no login com Google');
          }
        }
      });

      // Limpar container e renderizar botão
      container.innerHTML = '';
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: '100%'
      });
      
    } catch (error) {
      logger.error('Erro ao renderizar botão do Google', error as Error);
      onError('Erro ao carregar botão do Google');
    }
  }

  async signIn(): Promise<{ success: boolean; error?: string }> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, error: 'Falha na inicialização do Google Auth' };
      }
    }

    return new Promise((resolve) => {
      try {
        window.google.accounts.id.initialize({
          client_id: this.clientId,
          callback: async (response: GoogleAuthResponse) => {
            try {
              const result = await this.handleCredentialResponse(response);
              resolve(result);
            } catch (error) {
              logger.error('Erro no callback do Google', error as Error);
              resolve({ success: false, error: 'Erro no login com Google' });
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false
        });

        if (!window.google.accounts.id.prompt) {
          resolve({ success: false, error: 'Google Auth não disponível' });
          return;
        }

        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason();
            
            // Mensagens amigáveis para o utilizador
            let userMessage = 'Não foi possível conectar com o Google';
            switch (reason) {
              case 'opt_out_or_no_session':
              case 'suppressed_by_user':
                userMessage = 'Faça login no Google primeiro ou use o email/password';
                break;
              case 'browser_not_supported':
              case 'invalid_client':
              case 'missing_client_id':
              case 'secure_http_required':
              case 'unregistered_origin':
                userMessage = 'Configuração do Google indisponível';
                break;
              case 'unknown_reason':
              default:
                userMessage = 'Google Auth temporariamente indisponível';
                break;
            }
            
            logger.info(`Google One Tap não disponível: ${reason}`);
            resolve({ success: false, error: userMessage });
          } else if (notification.isSkippedMoment()) {
            resolve({ success: false, error: 'Login cancelado' });
          }
        });
        
      } catch (error) {
        logger.error('Erro ao iniciar login com Google', error as Error);
        resolve({ success: false, error: 'Erro interno - tente novamente' });
      }
    });
  }

  private async handleCredentialResponse(response: GoogleAuthResponse): Promise<{ success: boolean; error?: string }> {
    try {
      const credential = response.credential;
      
      if (!credential) {
        logger.error('Credential não encontrado na resposta do Google');
        return { success: false, error: 'Resposta inválida do Google' };
      }

      const result = await googleLogin(credential);
      
      if (result.success) {
        logger.info('Login com Google realizado com sucesso');
        return { success: true };
      } else {
        const errorMessage = result.message?.includes('Token') ? 
          'Erro na autenticação - tente novamente' : 
          result.message || 'Erro no login';
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      logger.error('Erro ao processar resposta do Google', error as Error);
      return { success: false, error: 'Erro interno - tente novamente' };
    }
  }

  reset(): void {
    this.isInitialized = false;
  }

  get initialized(): boolean {
    return this.isInitialized;
  }
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleAuthResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          prompt: (momentListener?: (promptMomentNotification: any) => void) => void;
          renderButton: (element: HTMLElement, options: {
            theme?: 'outline' | 'filled_blue' | 'filled_black';
            size?: 'large' | 'medium' | 'small';
            width?: string | number;
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
            shape?: 'rectangular' | 'pill' | 'circle' | 'square';
          }) => void;
          cancel: () => void;
        };
      };
    };
  }
}

const googleAuthService = new GoogleAuthService();

export default googleAuthService;
export type { GoogleAuthResponse, GoogleCredentialPayload };