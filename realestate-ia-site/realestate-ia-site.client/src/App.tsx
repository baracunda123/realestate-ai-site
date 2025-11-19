import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CookieBanner } from './components/CookieBanner';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { type Property } from './types/property';
import { getCurrentUser, logout, authUtils } from './api/auth.service';
import { createSafeDate } from './utils/PersonalArea';
import { logger } from './utils/logger';
import type { UserProfile } from './api/client';
import type { User } from './types/PersonalArea';
import { getFavoriteProperties, addToFavorites, removeFromFavorites } from './api/favorites.service';
import { isQuotaExceededError } from './api/chat-usage.service';
import { 
  getChatSessions, 
  createChatSession, 
  deleteChatSession,
  type ChatSessionDto 
} from './api/chat-sessions.service';
import { useTheme } from './hooks/useTheme';

// Extend Window interface to include gtag for Google Analytics
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js',
      targetId: string,
      config?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

// Lazy load components for better performance
const PropertyGrid = lazy(() => import('./components/PropertyGrid').then(m => ({ default: m.PropertyGrid })));
const AuthModal = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const ForgotPasswordModal = lazy(() => import('./components/ForgotPasswordModal').then(m => ({ default: m.ForgotPasswordModal })));
const WelcomeScreen = lazy(() => import('./components/WelcomeScreen').then(m => ({ default: m.WelcomeScreen })));
const EmailConfirmation = lazy(() => import('./components/EmailConfirmation'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const ChatPanel = lazy(() => import('./components/ChatPanel').then(m => ({ default: m.ChatPanel })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(m => ({ default: m.PricingPage })));
const SubscriptionSuccessPage = lazy(() => import('./pages/SubscriptionSuccessPage'));
const SubscriptionCancelPage = lazy(() => import('./pages/SubscriptionCancelPage'));

// Profile pages
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const FavoritesPage = lazy(() => import('./pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then(m => ({ default: m.HistoryPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

// Legal pages
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })));

// Loading components otimizados
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue"></div>
  </div>
);

// View types
type ViewType = 'home' | 'personal';
type AuthTab = 'signin' | 'signup';

// Extended user interface para uso interno com BD UserProfile
interface ExtendedUserProfile extends UserProfile {
  // Campos adicionais calculados para compatibilidade
  name?: string;
  phone?: string;
  avatar?: string;
}

export default function App() {
  // Property-related state
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [searchResults, setSearchResults] = useState<Property[] | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Navigation state
  const location = useLocation();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [showSearchPanel, setShowSearchPanel] = useState(() => {
    // Restaurar estado do sessionStorage ao carregar
    const saved = sessionStorage.getItem('showSearchPanel');
    return saved === 'true';
  });
  
  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  // Theme hook - Apply theme on mount
  useTheme();

  // Authentication state - usando novos tipos
  const [user, setUser] = useState<ExtendedUserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<AuthTab>('signin');
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasShownWelcomeToast, setHasShownWelcomeToast] = useState(false);

  // Conversation history state
  const [conversationHistory, setConversationHistory] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
    isQuotaError?: boolean;
  }>>([]);

  // Chat sessions state
  const [chatSessions, setChatSessions] = useState<ChatSessionDto[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  
  // AbortController para cancelar requisições
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [mobileView, setMobileView] = useState<'chat' | 'grid'>('chat'); // Estado para controlar vista em mobile


  // Memoized values para evitar recálculos
  const isDefaultState = useMemo((): boolean => {
    return searchQuery.trim() === '';
  }, [searchQuery]);


  // Load favorites when user logs in
  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }
    
    try {
      const userFavorites = await getFavoriteProperties();
      setFavorites(userFavorites);
    } catch (error) {
      logger.error('Erro ao carregar favoritos', 'APP', error as Error);
      setFavorites([]);
    }
  }, [user]);

  // Initialize authentication
  useEffect(() => {
    let isCleanup = false; // Prevent race conditions
    
    const initializeApp = async () => {
      logger.info('Inicializando aplicação...', 'APP');
      setIsInitializing(true);
      
      try {
        // First, check if we have a user in localStorage
        const storedUser = authUtils.getCurrentUser();
        const isAuthenticatedNow = authUtils.isAuthenticated();
        
        logger.info(`Estado inicial - hasStoredUser: ${!!storedUser}, isAuthenticated: ${isAuthenticatedNow}, userEmail: ${storedUser?.email}`, 'APP');
        
        // If we have user data and auth state, try to validate/refresh session
        if (storedUser && isAuthenticatedNow && !isCleanup) {
          logger.info('Tentando validar/renovar sessão existente...', 'APP');
          
          try {
            // Try to get current user (this will trigger token refresh if needed)
            const currentUser = await getCurrentUser();
            if (currentUser && !isCleanup) {
              logger.info('Sessão validada com sucesso', 'APP');
              const extendedUser: ExtendedUserProfile = {
                ...currentUser,
                name: currentUser.fullName || currentUser.name || '',
                phone: currentUser.phoneNumber || '',
                avatar: currentUser.avatarUrl,
              };
              setUser(extendedUser);
              setHasShownWelcomeToast(true); // Mark as shown to prevent fresh login toast
              
              // Session restored silently without toast
              logger.info('Sessão restaurada silenciosamente', 'APP');
              
              logger.info('Sessão restaurada silenciosamente', 'APP');
            } else if (!isCleanup) {
              logger.warn('Falha ao validar sessão - usuário não encontrado', 'APP');
              authUtils.clearTokens();
            }
          } catch  {
            if (!isCleanup) {
              logger.warn('Falha ao restaurar sessão', 'APP');
              authUtils.clearTokens();
            }
          }
        } else if (!isCleanup) {
          logger.info('Nenhuma sessão anterior detectada - estado limpo', 'APP');
        }
      } catch (error) {
        if (!isCleanup) {
          logger.error('Erro na inicialização da aplicação', 'APP', error as Error);
          authUtils.clearTokens();
        }
      } finally {
        if (!isCleanup) {
          setIsInitializing(false);
          logger.info('Inicialização concluída', 'APP');
        }
      }
    };

    initializeApp();

    // Cleanup function to prevent race conditions
    return () => {
      isCleanup = true;
    };
  }, []); // No dependencies to prevent re-runs

  // Load favorites when user changes
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  // Handle session expiration
  useEffect(() => {
    const handleSessionExpired = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string }>;
      logger.warn('Sessão expirada detectada', 'APP');
      
      // Limpar estado do utilizador
      setUser(null);
      setFavorites([]);
      setSearchResults(null);
      setConversationHistory([]);
      setChatSessions([]);
      setActiveSessionId(null);
      setShowSearchPanel(false);
      sessionStorage.removeItem('showSearchPanel');
      
      // Mostrar notificação
      toast.error('Sessão Expirada', {
        description: customEvent.detail.message,
        duration: 5000,
      });
      
      // Redirecionar para home e abrir modal de login
      navigate('/');
      setCurrentView('home');
      setAuthDefaultTab('signin');
      setIsAuthModalOpen(true);
    };

    window.addEventListener('session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, [navigate]);


  // Handle URL navigation - usando react-router
  useEffect(() => {
    const profileRoutes = ['/profile', '/favorites', '/history', '/settings'];
    if (profileRoutes.includes(location.pathname) && user) {
      setCurrentView('personal');
    } else if (location.pathname === '/' || location.pathname === '') {
      setCurrentView('home');
    }
    
    // Verificar se foi navegado com state para abrir modal de auth
    const state = location.state as { openAuthModal?: boolean; defaultTab?: 'signin' | 'signup' } | null;
    if (state?.openAuthModal) {
      setAuthDefaultTab(state.defaultTab || 'signin');
      setIsAuthModalOpen(true);
      // Limpar o state para evitar reabrir o modal no próximo render
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.pathname, location.state, user]);

  // Google Analytics - Track page views on route change
  useEffect(() => {
    if (typeof window.gtag !== 'undefined') {
      window.gtag('config', 'G-83S1V1NTB8', {
        page_path: location.pathname + location.search,
      });
      logger.info(`Google Analytics - Page view tracked: ${location.pathname}`, 'APP');
    }
  }, [location.pathname, location.search]);

  // Redirect to home if user logs out while in protected views
  useEffect(() => {
    const profileRoutes = ['/profile', '/favorites', '/history', '/settings'];
    if (!user && profileRoutes.includes(location.pathname)) {
      setCurrentView('home');
      navigate('/');
    }
  }, [user, location.pathname, navigate]);

  // Optimized callbacks
  const resetToDefaults = useCallback(() => {
    setSearchQuery('');
    setSearchResults(null);
    setAiError(null);
  }, []);

  // Navigation handlers - memoizados
  const navigateToPersonalArea = useCallback(() => {
    if (user) {
      setCurrentView('personal');
      navigate('/profile');
    } else {
      setAuthDefaultTab('signin');
      setIsAuthModalOpen(true);
    }
  }, [user, navigate]);

  const navigateToHome = useCallback(( reset: boolean = true ) => {
    if (reset) {
      resetToDefaults();
      setConversationHistory([]);
      setShowSearchPanel(false);
      sessionStorage.removeItem('showSearchPanel');
    }
    setCurrentView('home');
    navigate('/');
  }, [resetToDefaults, navigate]);

  // Property handlers - usando API
  const toggleFavorite = useCallback(async (property: Property) => {
    if (!user) {
      setAuthDefaultTab('signin');
      setIsAuthModalOpen(true);
      return;
    }
    
    const isFav = favorites.some(p => p.id === property.id);
    
    try {
      if (isFav) {
        const success = await removeFromFavorites(property.id);
        if (success) {
          setFavorites(prev => prev.filter(p => p.id !== property.id));
          toast.success('Removido dos favoritos', {
            description: property.title || 'Propriedade removida'
          });
        }
      } else {
        const success = await addToFavorites(property.id);
        if (success) {
          setFavorites(prev => [...prev, property]);
          toast.success('Adicionado aos favoritos', {
            description: property.title || 'Propriedade adicionada'
          });
        }
      }
    } catch {
      toast.error('Erro ao alterar favorito', {
        description: 'Tente novamente'
      });
    }
  }, [favorites, user]);


  // Handler para visualização de propriedades
  const handlePropertyView = useCallback((property: Property) => {
    // This callback will be used to refresh view history if needed
    // For now, it's just a placeholder since the tracking happens in PropertyCard
    logger.info(`Property viewed: ${property.title}`, 'APP');
  }, []);

  // Search handlers - otimizados
  const handleExampleSearch = useCallback((query: string) => {
    if (!user) {
      setAuthDefaultTab('signin');
      setIsAuthModalOpen(true);
      return;
    }
    setSearchQuery(query);
    setCurrentView('home');
    navigate('/');
    toast.success('Pesquisa iniciada!', {
      description: `Pesquisando: "${query}"`,
    });
  }, [user, navigate]);

  const handleSubmitSearch = useCallback(async (query: string, sessionId?: string) => {
    setAiLoading(true);
    setAiError(null);
    
    // Criar novo AbortController para esta requisição
    const controller = new AbortController();
    setAbortController(controller);
    
    // Se não há sessão ativa, o backend criará uma nova automaticamente
    // Não criar sessão no frontend para evitar duplicação
    let currentSessionId = sessionId || activeSessionId;
    
    // Add user message to history
    const userMessage = {
      id: `user-${Date.now()}`,
      type: 'user' as const,
      content: query,
      timestamp: new Date()
    };
    setConversationHistory(prev => [...prev, userMessage]);
    
    try {
      const { searchProperties } = await import('./api/properties.service');
      const result = await searchProperties({ 
        searchQuery: query,
        includeAiAnalysis: true,
        includeMarketData: true,
        sessionId: currentSessionId || undefined,
        signal: controller.signal
      });
      
      setSearchResults(result.properties || []);
      setSearchQuery(query);
      
      // Processar sessão retornada pelo backend
      if (result.sessionId && user) {
        setChatSessions(prev => {
          // Verificar se a sessão já existe no array
          const sessionExists = prev.some(s => s.id === result.sessionId);
          
          if (!sessionExists) {
            // Sessão foi criada pelo backend, adicionar ao estado
            const now = new Date().toISOString();
            const newSessionFromBackend: ChatSessionDto = {
              id: result.sessionId!,
              userId: user.id,
              title: result.updatedSessionTitle || "Nova Conversa",
              createdAt: now,
              updatedAt: now,
              isActive: true,
              messageCount: 1
            };
            
            logger.info(`Nova sessão criada pelo backend: ${result.sessionId}`, 'APP');
            return [newSessionFromBackend, ...prev];
          } else if (result.sessionTitleUpdated && result.updatedSessionTitle) {
            // Sessão já existe, apenas atualizar o título se foi modificado
            logger.info(`Título da sessão ${result.sessionId} atualizado para: ${result.updatedSessionTitle}`, 'APP');
            return prev.map(session => 
              session.id === result.sessionId 
                ? { ...session, title: result.updatedSessionTitle! }
                : session
            );
          }
          
          // Sessão existe mas título não foi atualizado
          return prev;
        });
        
        // Garantir que a sessão retornada é a ativa
        if (result.sessionId !== activeSessionId) {
          setActiveSessionId(result.sessionId);
        }
      }
      
      // Add AI response to history
      if (result.aiResponse) {
        const aiMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai' as const,
          content: result.aiResponse,
          timestamp: new Date()
        };
        setConversationHistory(prev => [...prev, aiMessage]);
      }
      
      if (result.properties?.length === 0) {
        toast.info('Nenhum resultado encontrado', { 
          description: 'IA fornecerá sugestões mesmo sem listagens.' 
        });
      } else {
        toast.success(`${result.properties.length} propriedades encontradas`, {
          description: 'Resultados carregados com análise da IA',
        });
      }
    } catch (error) {
      // Verificar se foi cancelado pelo utilizador
      if (error instanceof Error && error.name === 'CanceledError') {
        logger.info('Requisição cancelada pelo utilizador', 'APP');
        
        // Adicionar mensagem de cancelamento ao histórico
        const cancelMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai' as const,
          content: 'Mensagem cancelada.',
          timestamp: new Date()
        };
        setConversationHistory(prev => [...prev, cancelMessage]);
        return;
      }
      
      // Verificar se é erro de quota
      if (isQuotaExceededError(error)) {
        // Adicionar mensagem de erro de quota ao histórico
        const quotaErrorMessage = {
          id: `ai-error-${Date.now()}`,
          type: 'ai' as const,
          content: 'Atingiu o limite de mensagens disponíveis no seu plano. Para continuar a usar o Chat IA, atualize o seu plano para ter acesso a mais mensagens.',
          timestamp: new Date(),
          isQuotaError: true
        };
        setConversationHistory(prev => [...prev, quotaErrorMessage]);
        
        logger.info('Erro de quota detectado - mensagem adicionada ao histórico', 'APP');
      } else {
        // Erro genérico
        const errorMsg = 'Não foi possível obter resposta da IA no momento.';
        setSearchResults([]);
        setAiError(errorMsg);
        setSearchQuery(query);
        
        // Add error message to history
        const errorMessage = {
          id: `ai-error-${Date.now()}`,
          type: 'ai' as const,
          content: errorMsg,
          timestamp: new Date()
        };
        setConversationHistory(prev => [...prev, errorMessage]);
        
        if (currentView !== 'home') {
          setCurrentView('home');
          navigate('/');
        }
        
        toast.error('Erro na pesquisa', {
          description: 'Tente novamente em alguns instantes.',
        });
      }
    } finally {
      setAiLoading(false);
      setAbortController(null);
    }
  }, [currentView, navigate, activeSessionId]);
  
  // Handler para cancelar query em processamento
  const handleCancelQuery = useCallback(() => {
    if (abortController) {
      logger.info('Cancelando requisição em andamento', 'APP');
      abortController.abort();
      setAbortController(null);
      setAiLoading(false);
    }
  }, [abortController]);
  
  // Cancelar requisições pendentes ao fazer refresh/fechar página
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (abortController) {
        logger.info('Página sendo fechada - cancelando requisição pendente', 'APP');
        abortController.abort();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Cleanup: cancelar qualquer requisição pendente ao desmontar
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  // Load chat sessions when user logs in
  const loadChatSessions = useCallback(async () => {
    if (!user) {
      setChatSessions([]);
      setActiveSessionId(null);
      return;
    }

    try {
      const sessions = await getChatSessions();
      
      // Apenas carregar as sessões, não definir sessão ativa automaticamente
      setChatSessions(sessions);
    } catch (error) {
      logger.error('Erro ao carregar sessões de chat', 'APP', error as Error);
      setChatSessions([]);
    }
  }, [user]);

  // Load sessions when user changes
  useEffect(() => {
    loadChatSessions();
  }, [loadChatSessions]);

  // Handler para selecionar sessão
  const handleSelectSession = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId);
    
    try {
      // Carregar mensagens da sessão
      const { getChatSession, getSessionProperties } = await import('./api/chat-sessions.service');
      const session = await getChatSession(sessionId);
      
      // Converter mensagens para formato do histórico
      const history = session.messages.map(msg => ({
        id: msg.id,
        type: msg.role === 'user' ? 'user' as const : 'ai' as const,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      }));
      
      setConversationHistory(history);
      
      // Carregar propriedades associadas à sessão
      try {
        const properties = await getSessionProperties(sessionId);
        if (properties && properties.length > 0) {
          setSearchResults(properties);
          logger.info(`${properties.length} propriedades carregadas da sessão ${sessionId}`, 'APP');
        } else {
          setSearchResults(null);
        }
      } catch (propError) {
        logger.warn('Erro ao carregar propriedades da sessão, continuando sem elas', 'APP');
        setSearchResults(null);
      }
    } catch (error) {
      logger.error('Erro ao carregar sessão', 'APP', error as Error);
      toast.error('Erro ao carregar conversa');
    }
  }, []);

  // Handler para criar nova sessão
  const handleCreateSession = useCallback(async () => {
    try {
      const newSession = await createChatSession();
      setChatSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setConversationHistory([]);
      setSearchResults(null);
      setSearchQuery('');
      toast.success('Nova conversa criada');
    } catch (error) {
      logger.error('Erro ao criar sessão', 'APP', error as Error);
      toast.error('Erro ao criar nova conversa');
    }
  }, []);

  // Handler para eliminar sessão
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    try {
      await deleteChatSession(sessionId);
      
      const remainingSessions = chatSessions.filter(s => s.id !== sessionId);
      setChatSessions(remainingSessions);
      
      // Se eliminou a sessão ativa, mudar para outra
      if (activeSessionId === sessionId) {
        if (remainingSessions.length > 0) {
          setActiveSessionId(remainingSessions[0].id);
          await handleSelectSession(remainingSessions[0].id);
        } else {
          // Criar nova sessão se não houver nenhuma
          await handleCreateSession();
        }
      }
      
      toast.success('Conversa eliminada');
    } catch (error) {
      logger.error('Erro ao eliminar sessão', 'APP', error as Error);
      toast.error('Erro ao eliminar conversa');
    }
  }, [chatSessions, activeSessionId, handleSelectSession, handleCreateSession]);

  // Authentication handlers - otimizados
  const handleAuthSuccess = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const extendedUser: ExtendedUserProfile = {
          ...currentUser,
          name: currentUser.fullName || currentUser.name || '',
          phone: currentUser.phoneNumber || '',
          avatar: currentUser.avatarUrl
        };
        
        setUser(extendedUser);

        // Only show welcome toast for fresh logins if we haven't already shown welcome back
        if (!hasShownWelcomeToast) {
          toast.success(`Bem-vindo, ${currentUser.fullName || currentUser.name || 'utilizador'}!`, {
            description: 'Inicio de sessão efetuado com sucesso.',
          });
          setHasShownWelcomeToast(true);
        }

        logger.info('Login bem-sucedido', 'APP');
      } else {
        // Caso de registro sem confirmação de email - não há user profile ainda
        logger.info('Auth success mas sem user profile - provavelmente aguardando confirmação de email', 'APP');
      }
    } catch (error) {
      logger.error('Erro ao processar sucesso de autenticação', 'APP', error as Error);
      // Não mostrar erro - pode ser caso normal de aguardar confirmação de email
      logger.info('Não foi possível carregar dados do utilizador - pode estar aguardando confirmação', 'APP');
    }
  }, [hasShownWelcomeToast]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setUser(null);
      setFavorites([]);
      setHasShownWelcomeToast(false);
      navigateToHome(true);
      
      toast.success('Logout realizado com sucesso!', {
        description: 'Até breve!',
      });
    } catch (error) {
      logger.error('Erro no logout', 'APP', error as Error);
      authUtils.clearTokens();
      setUser(null);
      setFavorites([]);
      setHasShownWelcomeToast(false);
      navigateToHome(true);
      toast.error('Erro no logout, mas desconectado localmente.');
    }
  }, [navigateToHome]);

  // Modal handlers - otimizados
  const openAuthModal = useCallback((tab: AuthTab = 'signin') => {
    setAuthDefaultTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  // Convert extended user to regular user for components that need it - memoizado
  const convertToUser = useCallback((extendedUser: ExtendedUserProfile) => ({
    id: extendedUser.id,
    email: extendedUser.email,
    fullName: extendedUser.fullName,
    name: extendedUser.name || extendedUser.fullName || '',
    phone: extendedUser.phone || extendedUser.phoneNumber || '',
    avatar: extendedUser.avatar || extendedUser.avatarUrl,
    avatarUrl: extendedUser.avatarUrl,
    phoneNumber: extendedUser.phoneNumber,
    isEmailVerified: extendedUser.isEmailVerified,
    createdAt: createSafeDate(extendedUser.createdAt),
    updatedAt: extendedUser.updatedAt ? createSafeDate(extendedUser.updatedAt) : undefined
  }), []);

  // Handler para atualizar perfil do usuário (incluindo avatar)
  const handleUpdateProfile = useCallback(async (updatedData: Partial<User>) => {
    if (!user) return;
    
    try {
      // Convert User type to ExtendedUserProfile type for local state
      const extendedUpdateData: Partial<ExtendedUserProfile> = {
        ...updatedData,
        name: updatedData.name || updatedData.fullName,
        phone: updatedData.phone || updatedData.phoneNumber,
        avatar: updatedData.avatar || updatedData.avatarUrl,
        // Convert Date to string if createdAt is provided
        createdAt: updatedData.createdAt ? updatedData.createdAt.toISOString() : undefined,
        updatedAt: updatedData.updatedAt ? updatedData.updatedAt.toISOString() : undefined
      };
      
      // Update local state immediately for better UX
      const updatedUser = { ...user, ...extendedUpdateData };
      setUser(updatedUser);
      
      // If avatar was updated, also update the auth service storage
      if (updatedData.avatarUrl || updatedData.avatar) {
        // Update the stored user data with new avatar
        const { updateProfile } = await import('./api/auth.service');
        await updateProfile({
          avatarUrl: updatedData.avatarUrl || updatedData.avatar,
          fullName: updatedData.fullName || updatedData.name
        });
      }
      
      logger.info('Perfil atualizado com sucesso', 'APP');
    } catch (error) {
      logger.error('Erro ao atualizar perfil', 'APP', error as Error);
      toast.error('Erro ao atualizar perfil');
    }
  }, [user]);

  // Handler para eliminação de conta - logout e redirecionamento
  const handleDeleteAccount = useCallback(async () => {
    try {
      // Limpar todos os estados locais
      authUtils.clearTokens();
      setUser(null);
      setFavorites([]);
      setCurrentView('home');
      resetToDefaults();
      setHasShownWelcomeToast(false);
      navigate('/');
      
      logger.info('Conta eliminada - utilizador deslogado e redirecionado', 'APP');
    } catch (error) {
      logger.error('Erro no processo de eliminação de conta', 'APP', error as Error);
      authUtils.clearTokens();
      setUser(null);
      setFavorites([]);
      setHasShownWelcomeToast(false);
      navigate('/');
    }
  }, [resetToDefaults, navigate]);

  // Show loading spinner during initialization
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-muted-foreground">Carregando aplicação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        user={user}
        onOpenAuth={openAuthModal}
        onLogout={handleLogout}
        onNavigateToPersonal={navigateToPersonalArea}
        onNavigateToHome={navigateToHome}
        currentView={currentView}
      />
      
      <main className="flex-1 site-container py-0">
        <Routes>
          {/* Rota de confirmação de email - token como path parameter */}
          <Route 
            path="/confirm-email/:token" 
            element={
              <div className="py-6 lg:py-10">
                <Suspense fallback={<LoadingSpinner />}>
                  <EmailConfirmation />
                </Suspense>
              </div>
            } 
          />

          {/* Rota de reset de palavra-passe - token como path parameter */}
          <Route 
            path="/reset-password/:token" 
            element={
              <div className="py-6 lg:py-10">
                <Suspense fallback={<LoadingSpinner />}>
                  <ResetPassword />
                </Suspense>
              </div>
            } 
          />

          {/* Rota de Pricing */}
          <Route 
            path="/pricing" 
            element={
              <div className="py-6 lg:py-10">
                <Suspense fallback={<LoadingSpinner />}>
                  <PricingPage />
                </Suspense>
              </div>
            } 
          />

          {/* Rotas de Subscrição */}
          <Route 
            path="/subscription/success" 
            element={
              <div className="py-6 lg:py-10">
                <Suspense fallback={<LoadingSpinner />}>
                  <SubscriptionSuccessPage />
                </Suspense>
              </div>
            } 
          />
          <Route 
            path="/subscription/cancel" 
            element={
              <div className="py-6 lg:py-10">
                <Suspense fallback={<LoadingSpinner />}>
                  <SubscriptionCancelPage />
                </Suspense>
              </div>
            } 
          />

          {/* Legal Routes */}
          <Route 
            path="/privacy" 
            element={
              <div className="py-6 lg:py-10">
                <Suspense fallback={<LoadingSpinner />}>
                  <PrivacyPolicyPage />
                </Suspense>
              </div>
            } 
          />
          <Route 
            path="/terms" 
            element={
              <div className="py-6 lg:py-10">
                <Suspense fallback={<LoadingSpinner />}>
                  <TermsOfServicePage />
                </Suspense>
              </div>
            } 
          />

          {/* Profile Routes */}
          <Route 
            path="/profile" 
            element={
              user ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <ProfilePage
                    user={convertToUser(user)}
                    onUpdateProfile={handleUpdateProfile}
                    hasActiveSearch={!isDefaultState && searchResults !== null}
                    onNavigateToHome={navigateToHome}
                  />
                </Suspense>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <p className="text-muted-foreground">Por favor, faz login para aceder ao perfil.</p>
                </div>
              )
            } 
          />

          <Route 
            path="/favorites" 
            element={
              user ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <FavoritesPage
                    user={convertToUser(user)}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                    onPropertyView={handlePropertyView}
                    hasActiveSearch={!isDefaultState && searchResults !== null}
                    onNavigateToHome={navigateToHome}
                  />
                </Suspense>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <p className="text-muted-foreground">Por favor, faz login para aceder aos teus favoritos.</p>
                </div>
              )
            } 
          />

          <Route 
            path="/history" 
            element={
              user ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <HistoryPage
                    user={convertToUser(user)}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                    hasActiveSearch={!isDefaultState && searchResults !== null}
                    onNavigateToHome={navigateToHome}
                  />
                </Suspense>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <p className="text-muted-foreground">Por favor, faz login para aceder ao teu histórico.</p>
                </div>
              )
            } 
          />

          <Route 
            path="/settings" 
            element={
              user ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <SettingsPage
                    user={convertToUser(user)}
                    onDeleteAccount={handleDeleteAccount}
                    hasActiveSearch={!isDefaultState && searchResults !== null}
                    onNavigateToHome={navigateToHome}
                  />
                </Suspense>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <p className="text-muted-foreground">Por favor, faz login para aceder às configurações.</p>
                </div>
              )
            } 
          />

          {/* Rota principal */}
          <Route 
            path="/" 
            element={
              showSearchPanel ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <div className="fixed inset-0 top-16 lg:top-20 flex gap-0">
                    {/* Chat Panel - Sidebar fixa à esquerda (desktop) ou full screen (mobile) */}
                    <div className={`w-full lg:w-[380px] xl:w-[420px] 2xl:w-[450px] flex-shrink-0 border-r border-pale-clay-deep bg-porcelain-soft ${
                      mobileView === 'grid' ? 'hidden lg:block' : ''
                    }`}>
                      <ChatPanel
                        onSubmitQuery={handleSubmitSearch}
                        onCancelQuery={handleCancelQuery}
                        loading={aiLoading}
                        error={aiError}
                        conversationHistory={conversationHistory}
                        sessions={chatSessions}
                        activeSessionId={activeSessionId}
                        onSelectSession={handleSelectSession}
                        onCreateSession={handleCreateSession}
                        onDeleteSession={handleDeleteSession}
                        onOpenAuthModal={openAuthModal}
                        onShowResults={() => setMobileView('grid')}
                        showResultsButton={!!(searchResults && searchResults.length > 0)}
                      />
                    </div>
                    
                    {/* Property Grid - Área principal à direita (desktop) ou full screen (mobile) */}
                    <div className={`flex-1 overflow-y-auto bg-porcelain-soft ${
                      mobileView === 'chat' ? 'hidden lg:block' : ''
                    }`}>
                      <div className="p-4 sm:p-6 lg:p-8">
                        <PropertyGrid
                          searchQuery={searchQuery}
                          serverResults={searchResults || undefined}
                          favorites={favorites}
                          onToggleFavorite={toggleFavorite}
                          onPropertyView={handlePropertyView}
                          onBackToChat={() => setMobileView('chat')}
                          showBackButton={true}
                        />
                      </div>
                    </div>
                  </div>
                </Suspense>
              ) : (
                <div className="py-6 lg:py-10">
                  <Suspense fallback={< LoadingSpinner />}>
                    <WelcomeScreen
                      onExampleSearch={handleExampleSearch}
                      user={user ? convertToUser(user) : null}
                      onStartSignup={() => openAuthModal('signup')}
                      onStartSearch={() => {
                      // Limpar sessão ativa para começar nova conversa
                      setActiveSessionId(null);
                      sessionStorage.setItem('showSearchPanel', 'true');
                      setShowSearchPanel(true);
                    }}
                  />
                </Suspense>
                </div>
              )
            } 
          />
        </Routes>
      </main>

      {/* Footer - esconder quando estiver no chat */}
      {!showSearchPanel && <Footer />}

      <CookieBanner />

      <Suspense fallback={null}>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          defaultTab={authDefaultTab}
          onOpenForgotPassword={() => setIsForgotPasswordModalOpen(true)}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ForgotPasswordModal
          isOpen={isForgotPasswordModalOpen}
          onClose={() => setIsForgotPasswordModalOpen(false)}
          onBackToAuth={() => {
            setIsForgotPasswordModalOpen(false);
            setIsAuthModalOpen(true);
          }}
        />
      </Suspense>

      <Toaster richColors position="top-right" />
    </div>
  );
}
