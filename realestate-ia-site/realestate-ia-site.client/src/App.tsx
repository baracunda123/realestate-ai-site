import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { PersonalArea } from './components/PersonalArea';
import { Footer } from './components/Footer';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';
import { type Property } from './types/property';
import { getCurrentUser, logout, authUtils } from './api/auth.service';
import { createSafeDate } from './utils/PersonalArea';
import { logger } from './utils/logger';
import type { UserProfile } from './api/client';
import type { User } from './types/PersonalArea';
import { getFavoriteProperties, addToFavorites, removeFromFavorites } from './api/favorites.service';
import { usePriceAlerts } from './hooks/usePriceAlerts';
import { useSignalR } from './hooks/useSignalR';

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
const WelcomeScreen = lazy(() => import('./components/WelcomeScreen').then(m => ({ default: m.WelcomeScreen })));
const EmailConfirmation = lazy(() => import('./components/EmailConfirmation'));
const ChatPanel = lazy(() => import('./components/ChatPanel').then(m => ({ default: m.ChatPanel })));

// Loading components otimizados
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-burnt-peach"></div>
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
  
  // Authentication state - usando novos tipos
  const [user, setUser] = useState<ExtendedUserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<AuthTab>('signin');
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasShownWelcomeToast, setHasShownWelcomeToast] = useState(false);

  // Hook para gerenciar alertas de preço
  const {
    alerts,
    hasAlertForPropertyId,
    createAlertForProperty,
    removeAlertForProperty,
    removeAlert,
    updateAlertThreshold,
  } = usePriceAlerts();

  // Hook para gerenciar SignalR (notificações em tempo real)
  const {
    isConnected: signalRConnected,
    connect: connectSignalR,
    disconnect: disconnectSignalR
  } = useSignalR({
    autoConnect: false, // NUNCA conectar automaticamente
    showToasts: true    // Mostrar toasts para notificações
  });

  // Wrapper functions para compatibilidade com PersonalArea
  const handleDeleteAlert = useCallback(async (alertId: string) => {
    try {
      await removeAlert(alertId);
      toast.success('Alerta removido');
    } catch (error) {
      logger.error('Erro ao remover alerta', 'PRICE_ALERTS', error as Error);
      toast.error('Erro ao remover alerta');
    }
  }, [removeAlert]);

  const handleUpdateAlert = useCallback(async (alertId: string, threshold: number) => {
    try {
      await updateAlertThreshold(alertId, threshold);
      toast.success(`Alerta atualizado`);
    } catch (error) {
      logger.error('Erro ao atualizar alerta', 'PRICE_ALERTS', error as Error);
      toast.error('Erro ao atualizar alerta');
    }
  }, [updateAlertThreshold]);

  // Memoized values para evitar recálculos
  const isDefaultState = useMemo((): boolean => {
    return searchQuery.trim() === '';
  }, [searchQuery]);

  const showWelcomeScreen = useMemo(() => 
    !isInitializing && !showSearchPanel && (!user || (user && isDefaultState && currentView === 'home' && searchResults === null)), 
    [user, isDefaultState, currentView, searchResults, isInitializing, showSearchPanel]
  );

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
              
              // NÃO conectar SignalR automaticamente na restauração
              logger.info('Sessão restaurada - SignalR permanece desativado até ser necessário', 'APP');
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

  // Monitorar alertas e gerenciar conexão SignalR
  useEffect(() => {
    if (!user) return;

    const hasActiveAlerts = alerts.length > 0;
    
    if (hasActiveAlerts && !signalRConnected) {
      // Tem alertas mas SignalR não está conectado - conectar silenciosamente
      logger.info('Alertas ativos detectados - conectando SignalR silenciosamente', 'APP');
      connectSignalR().catch(() => {
        logger.warn('Falha ao conectar SignalR automaticamente', 'APP');
      });
    } else if (!hasActiveAlerts && signalRConnected) {
      // Não tem alertas mas SignalR está conectado - desconectar
      logger.info('Nenhum alerta ativo - desconectando SignalR', 'APP');
      disconnectSignalR().catch(() => {
        logger.warn('Falha ao desconectar SignalR', 'APP');
      });
    }
  }, [user, alerts.length, signalRConnected, connectSignalR, disconnectSignalR]);

  // Handle URL navigation - usando react-router
  useEffect(() => {
    if (location.pathname === '/personal' && user) {
      setCurrentView('personal');
    } else if (location.pathname === '/' || location.pathname === '') {
      setCurrentView('home');
    }
    
    // Verificar se foi navegado com state para abrir modal de auth
    const state = location.state as { openAuthModal?: boolean; defaultTab?: 'signin' | 'signup' } | null;
    if (state?.openAuthModal) {
      setAuthDefaultTab(state.defaultTab || 'signin');
      setIsAuthModalOpen(true);
      // Limpar o state para evitar reabrir o modal
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, user, navigate]);

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
    if (!user && currentView === 'personal') {
      setCurrentView('home');
      navigate('/');
    }
  }, [user, currentView, navigate]);

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
      navigate('/personal');
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

  // Handler para criar/remover alertas de preço
  const handleCreatePriceAlert = useCallback(async (property: Property) => {
    if (!user) {
      setAuthDefaultTab('signin');
      setIsAuthModalOpen(true);
      return;
    }
    
    try {
      const hasAlert = hasAlertForPropertyId(property.id);
      
      if (hasAlert) {
        await removeAlertForProperty(property.id);
        toast.success('Alerta removido');
        
        // Se não há mais alertas, desconectar SignalR silenciosamente
        const remainingAlerts = alerts.filter(a => a.propertyId !== property.id);
        if (remainingAlerts.length === 0 && signalRConnected) {
          await disconnectSignalR();
        }
      } else {
        await createAlertForProperty(property, 5); // Default 5%
        toast.success('Alerta criado');
        
        // Primeira vez criando alerta - conectar SignalR silenciosamente
        if (!signalRConnected) {
          try {
            await connectSignalR();
          } catch {
            logger.warn('Falha ao ativar SignalR', 'APP');
            // Não mostrar erro ao utilizador - alerta funciona mesmo sem SignalR
          }
        }
      }
    } catch (error) {
      logger.error('Erro ao gerenciar alerta', 'APP', error as Error);
      toast.error('Erro ao gerenciar alerta');
    }
  }, [user, hasAlertForPropertyId, removeAlertForProperty, createAlertForProperty, alerts, signalRConnected, connectSignalR, disconnectSignalR]);

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

  const handleSubmitSearch = useCallback(async (query: string) => {
    setAiLoading(true);
    setAiError(null);
    
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
        includeMarketData: true
      });
      
      setSearchResults(result.properties || []);
      setSearchQuery(query);
      
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
    } catch {
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
    } finally {
      setAiLoading(false);
    }
  }, [currentView, navigate]);
  
  // Conversation history state
  const [conversationHistory, setConversationHistory] = useState<Array<{
    id: string;
    type: 'user' | 'ai';
    content: string;
    timestamp: Date;
  }>>([]);

  // Handler para limpar completamente a conversa
  const handleClearConversation = useCallback(() => {
    // Limpar histórico local
    setConversationHistory([]);
    // Limpar resultados de pesquisa
    setSearchResults(null);
    setSearchQuery('');
    setAiError(null);
  }, []);

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

        // NÃO conectar SignalR automaticamente - só quando necessário
        logger.info('Login bem-sucedido - SignalR será ativado apenas se houver alertas', 'APP');
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
      // Desconectar SignalR se estiver conectado
      if (signalRConnected) {
        await disconnectSignalR();
      }
      
      await logout();
      setUser(null);
      setFavorites([]);
      setCurrentView('home');
      resetToDefaults();
      setHasShownWelcomeToast(false);
      navigate('/');
      
      toast.success('Logout realizado com sucesso!', {
        description: 'Até breve!',
      });
    } catch (error) {
      logger.error('Erro no logout', 'APP', error as Error);
      if (signalRConnected) {
        await disconnectSignalR(); // Tentar desconectar mesmo em caso de erro
      }
      authUtils.clearTokens();
      setUser(null);
      setFavorites([]);
      setHasShownWelcomeToast(false);
      toast.error('Erro no logout, mas desconectado localmente.');
    }
  }, [resetToDefaults, disconnectSignalR, signalRConnected, navigate]);

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
      // Desconectar SignalR se estiver conectado
      if (signalRConnected) {
        await disconnectSignalR();
      }
      
      // Limpar todos os estados locais
      authUtils.clearTokens();
      setUser(null);
      setFavorites([]);
      setCurrentView('home');
      resetToDefaults();
      setHasShownWelcomeToast(false);
      navigate('/');
      
      logger.info('Conta eliminada - utilizador deslogado e redirecionado', 'APP');
      
      // Nota: O toast de sucesso já foi mostrado pelo PersonalAreaSettings
    } catch (error) {
      logger.error('Erro no processo de eliminação de conta', 'APP', error as Error);
      // Limpar dados localmente mesmo se houver erro
      if (signalRConnected) {
        await disconnectSignalR();
      }
      authUtils.clearTokens();
      setUser(null);
      setFavorites([]);
      setHasShownWelcomeToast(false);
      navigate('/');
    }
  }, [resetToDefaults, disconnectSignalR, signalRConnected, navigate]);

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
      
      <main className="flex-1 site-container py-8">
        <Routes>
          {/* Rota de confirmação de email - token como path parameter */}
          <Route 
            path="/confirm-email/:token" 
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <EmailConfirmation />
              </Suspense>
            } 
          />

          {/* Rota de área pessoal */}
          <Route 
            path="/personal" 
            element={
              user ? (
                <PersonalArea
                  user={convertToUser(user)}
                  onNavigateToHome={navigateToHome}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  hasActiveSearch={!isDefaultState && searchResults !== null}
                  onCreatePriceAlert={handleCreatePriceAlert}
                  hasAlertForPropertyId={hasAlertForPropertyId}
                  alerts={alerts}
                  onDeleteAlert={handleDeleteAlert}
                  onUpdateAlert={handleUpdateAlert}
                  onUpdateProfile={handleUpdateProfile}
                  onDeleteAccount={handleDeleteAccount}
                />
              ) : (
                <div className="flex items-center justify-center p-8">
                  <p className="text-muted-foreground">Por favor, faça login para acessar sua área pessoal.</p>
                </div>
              )
            } 
          />

          {/* Rota principal */}
          <Route 
            path="/" 
            element={
              showWelcomeScreen ? (
                <Suspense fallback={< LoadingSpinner />}>
                  <WelcomeScreen
                    onExampleSearch={handleExampleSearch}
                    user={user ? convertToUser(user) : null}
                    onStartSignup={() => openAuthModal('signup')}
                    onStartSearch={() => {
                      sessionStorage.setItem('showSearchPanel', 'true');
                      setShowSearchPanel(true);
                    }}
                  />
                </Suspense>
              ) : user && showSearchPanel ? (
                <Suspense fallback={<LoadingSpinner />}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Chat Panel */}
                    <div className="order-1 lg:order-1">
                      <ChatPanel
                        onSubmitQuery={handleSubmitSearch}
                        loading={aiLoading}
                        error={aiError}
                        conversationHistory={conversationHistory}
                        onClearConversation={handleClearConversation}
                      />
                    </div>
                    
                    {/* Property Grid */}
                    <div className="order-2 lg:order-2">
                      <PropertyGrid
                        searchQuery={searchQuery}
                        serverResults={searchResults || undefined}
                        favorites={favorites}
                        onToggleFavorite={toggleFavorite}
                        onCreatePriceAlert={handleCreatePriceAlert}
                        hasAlertForPropertyId={hasAlertForPropertyId}
                        onPropertyView={handlePropertyView}
                      />
                    </div>
                  </div>
                </Suspense>
              ) : null
            } 
          />
        </Routes>
      </main>

      <Footer />

      <Suspense fallback={null}>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          defaultTab={authDefaultTab}
        />
      </Suspense>

      <Toaster richColors position="top-right" />
    </div>
  );
}
