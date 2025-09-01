// session.service.ts
// Service for managing user sessions and authentication

import { v4 as uuidv4 } from 'uuid';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface SessionData {
  sessionId: string;
  userId?: string;
  tokens?: AuthTokens;
  isAuthenticated: boolean;
}

class SessionService {
    private readonly SESSION_KEY = 'realestate_session_id';
    private readonly AUTH_KEY = 'realestate_auth_data';
    
    private sessionData: SessionData;

    constructor() {
        this.sessionData = this.initializeSession();
    }

    private isStorageAvailable(): boolean {
        try {
            if (typeof window === 'undefined') return false;
            const test = '__test__';
            localStorage.setItem(test, '1');
            localStorage.removeItem(test);
            return true;
        } catch {
            return false;
        }
    }

    private initializeSession(): SessionData {
        let sessionData: SessionData = {
            sessionId: uuidv4(),
            isAuthenticated: false
        };

        if (this.isStorageAvailable()) {
            try {
                // Recupera session ID - FIX: verificação explícita de null
                const savedSessionId = localStorage.getItem(this.SESSION_KEY);
                if (savedSessionId && savedSessionId.trim() !== '') {
                    sessionData.sessionId = savedSessionId;
                }

                // Recupera dados de auth
                const savedAuthData = localStorage.getItem(this.AUTH_KEY);
                if (savedAuthData && savedAuthData.trim() !== '') {
                    const authData = JSON.parse(savedAuthData);
                    if (authData.tokens?.expiresAt > Date.now()) {
                        sessionData = { ...sessionData, ...authData };
                    } else {
                        localStorage.removeItem(this.AUTH_KEY);
                    }
                }
            } catch (error) {
                console.warn('Erro ao recuperar sessão:', error);
            }
        }

        this.saveSession(sessionData);
        return sessionData;
    }

    private saveSession(data: SessionData): void {
        if (!this.isStorageAvailable()) return;

        try {
            localStorage.setItem(this.SESSION_KEY, data.sessionId);
            
            if (data.isAuthenticated && data.tokens) {
                localStorage.setItem(this.AUTH_KEY, JSON.stringify({
                    userId: data.userId,
                    tokens: data.tokens,
                    isAuthenticated: data.isAuthenticated
                }));
            }
        } catch (error) {
            console.warn('Erro ao salvar sessão:', error);
        }
    }

    // Métodos públicos
    public getSessionId(): string {
        return this.sessionData.sessionId;
    }

    public login(userId: string, tokens: AuthTokens): void {
        this.sessionData = {
            ...this.sessionData,
            userId,
            tokens,
            isAuthenticated: true
        };
        this.saveSession(this.sessionData);
    }

    public logout(): void {
        if (this.isStorageAvailable()) {
            localStorage.removeItem(this.AUTH_KEY);
        }
        
        this.sessionData = {
            sessionId: this.sessionData.sessionId,
            isAuthenticated: false
        };
        this.saveSession(this.sessionData);
    }

    public isAuthenticated(): boolean {
        return this.sessionData.isAuthenticated && 
               !!this.sessionData.tokens &&
               this.sessionData.tokens.expiresAt > Date.now();
    }

    public getCurrentUser(): { userId?: string; isAuthenticated: boolean } {
        return {
            userId: this.sessionData.userId,
            isAuthenticated: this.isAuthenticated()
        };
    }

    public getAccessToken(): string | null {
        return this.isAuthenticated() ? this.sessionData.tokens?.accessToken || null : null;
    }

    public clearSession(): void {
        if (this.isStorageAvailable()) {
            localStorage.removeItem(this.SESSION_KEY);
            localStorage.removeItem(this.AUTH_KEY);
        }
        
        this.sessionData = {
            sessionId: uuidv4(),
            isAuthenticated: false
        };
    }

    public regenerateSession(): string {
        this.sessionData.sessionId = uuidv4();
        this.saveSession(this.sessionData);
        return this.sessionData.sessionId;
    }

    // Para compatibilidade
    public setUserSession(userId: string): void {
        const mockTokens: AuthTokens = {
            accessToken: `mock_token_${userId}`,
            refreshToken: `mock_refresh_${userId}`,
            expiresAt: Date.now() + (24 * 60 * 60 * 1000)
        };
        this.login(userId, mockTokens);
    }
}

const sessionService = new SessionService();
export default sessionService;
export type { AuthTokens, SessionData };