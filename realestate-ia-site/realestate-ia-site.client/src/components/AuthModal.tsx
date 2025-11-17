import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Sparkles,
  AlertCircle,
  CheckCircle,
  Loader2,
  MailCheck
} from 'lucide-react';
import { login, register, type LoginPayload, type RegisterPayload } from '../api/auth.service';
import googleAuthService from '../api/google-auth.service';
import { client as logger, auth as authLogger } from '../utils/logger';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultTab?: 'signin' | 'signup';
  onOpenForgotPassword?: () => void;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string[] | string> | string[];
      title?: string;
    };
  };
  message?: string;
}

const INITIAL_FORM_DATA: FormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: ''
};

export function AuthModal({ isOpen, onClose, onSuccess, defaultTab = 'signin', onOpenForgotPassword }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(defaultTab);
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  // Ref para o container do botão do Google
  const googleButtonRef = useRef<HTMLDivElement>(null);
  // Ref para o conteúdo do modal (para scroll)
  const dialogContentRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens/closes or tab changes
  useEffect(() => {
    if (!isOpen) {
      // Limpar imediatamente quando modal fecha
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
      }
      return;
    }
    
    logger.info('Modal de autenticação aberto');
    setActiveTab(defaultTab);
    resetForm();
    
    // Inicializar Google Auth quando o modal abrir
    let mounted = true;
    let renderTimeout: NodeJS.Timeout;
    
    // Pequeno delay para garantir que o DOM está estável
    renderTimeout = setTimeout(() => {
      if (!mounted || !googleButtonRef.current) return;
      
      googleAuthService.initialize().then(success => {
        if (!mounted || !googleButtonRef.current) return;
        
        if (success) {
          logger.info('Google Auth inicializado com sucesso');
          // Renderizar botão do Google
          googleAuthService.renderButtonIn(
            googleButtonRef.current,
            handleGoogleSuccess,
            handleGoogleError
          );
        } else {
          logger.error('Falha na inicialização do Google Auth');
        }
      }).catch(error => {
        logger.error('Erro na inicialização do Google Auth', error);
      });
    }, 150); // Aumentado para 150ms
    
    // Cleanup ao desmontar
    return () => {
      mounted = false;
      clearTimeout(renderTimeout);
      
      // Limpar o container usando innerHTML (mais seguro)
      if (googleButtonRef.current) {
        googleButtonRef.current.innerHTML = '';
      }
    };
  }, [isOpen, defaultTab]);

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setShowSignInPassword(false);
    setShowSignUpPassword(false);
    setShowConfirmPassword(false);
    setError(null);
    setSuccess(null);
    setShowEmailConfirmation(false);
    setAcceptTerms(false);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear messages when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
    if (showEmailConfirmation) setShowEmailConfirmation(false);
  };

  const extractErrorMessage = (error: ApiError): string => {
    if (error.response?.data) {
      const data = error.response.data;
      
      if (data.message) return data.message;
      
      if (data.errors) {
        const errorMessages: string[] = [];
        
        if (typeof data.errors === 'object' && !Array.isArray(data.errors)) {
          const dict = data.errors as Record<string, string[] | string>;
          Object.keys(dict).forEach(field => {
            const fieldErrors = dict[field];
            if (Array.isArray(fieldErrors)) {
              errorMessages.push(...fieldErrors);
            } else if (typeof fieldErrors === 'string') {
              errorMessages.push(fieldErrors);
            }
          });
        } else if (Array.isArray(data.errors)) {
          errorMessages.push(...data.errors.filter(e => typeof e === 'string'));
        }
        
        if (errorMessages.length > 0) {
          return errorMessages.join('. ');
        }
      }
      
      if (data.title && data.title !== 'One or more validation errors occurred.') {
        return data.title;
      }
    }
    
    return error.message || 'Internal server error. Please try again.';
  };

  const handleGoogleSuccess = () => {
    setSuccess('Login com Google realizado com sucesso!');
    resetForm();
    
    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 1500);
  };

  const handleGoogleError = (error: string) => {
    setError(error);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const loginData: LoginPayload = {
        email: formData.email,
        password: formData.password
      };

      const result = await login(loginData);

      if (result.success) {
        setSuccess(result.message || 'Login successful!');
        resetForm();
        
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setError(result.message || result.errors?.join('. ') || 'Erro inesperado no login.');
      }
    } catch (error) {
      authLogger.error('Login error', error as Error);
      setError(extractErrorMessage(error as ApiError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (!acceptTerms) {
      setError('You must accept the terms of use to continue');
      setIsLoading(false);
      return;
    }

    try {
      const registerData: RegisterPayload = {
        fullName: formData.name,
        email: formData.email,
        phoneNumber: formData.phone || undefined,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        acceptTerms: acceptTerms
      };

      const result = await register(registerData);

      if (result.success) {
        resetForm();
        setShowEmailConfirmation(true);
        setSuccess(result.message || 'Account created successfully!');
        
        // Scroll para o topo do modal para mostrar a mensagem de confirmação
        setTimeout(() => {
          if (dialogContentRef.current) {
            dialogContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 100);
      } else {
        setError(result.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      authLogger.error('Registration error', error as Error);
      setError(extractErrorMessage(error as ApiError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    const newTab = value as 'signin' | 'signup';
    
    // Limpar dados sensíveis ao trocar de tab
    setFormData(prev => ({
      ...prev,
      password: '',
      confirmPassword: '',
      // Manter email entre tabs para melhor UX
      // name e phone apenas no signup, então resetar se for para signin
      name: newTab === 'signin' ? '' : prev.name,
      phone: newTab === 'signin' ? '' : prev.phone
    }));
    
    // Resetar estados de visibilidade de password
    setShowSignInPassword(false);
    setShowSignUpPassword(false);
    setShowConfirmPassword(false);
    
    // Limpar mensagens de erro/sucesso
    setError(null);
    setSuccess(null);
    setShowEmailConfirmation(false);
    
    setActiveTab(newTab);
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  const renderMessage = () => {
    if (error) {
      return (
        <div className="bg-error-soft border border-error-gentle/30 rounded-xl p-4 mb-4 shadow-clay-soft">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-error-gentle mt-0.5 flex-shrink-0" />
            <div className="text-sm text-error-strong flex-1 break-words">
              {error.split('. ').map((errorMsg, index) => (
                <div key={`error-${index}-${errorMsg.slice(0, 10)}`} className={index > 0 ? 'mt-1' : ''}>
                  {errorMsg}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (success) {
      return (
        <div className="bg-success-soft border border-success-gentle/30 rounded-xl p-4 mb-4 shadow-clay-soft">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-success-gentle mt-0.5 flex-shrink-0" />
            <p className="text-sm text-success-strong text-center flex-1 break-words">{success}</p>
          </div>
        </div>
      );
    }

    if (showEmailConfirmation) {
      return (
        <div className="bg-info-soft border border-info-gentle/30 rounded-xl p-4 mb-4 shadow-clay-soft">
          <div className="flex flex-col items-center text-center space-y-3">
            <MailCheck className="h-6 w-6 text-info-gentle flex-shrink-0" />
            <div className="text-sm text-info-strong break-words">
              <h4 className="font-semibold mb-2">Confirmar o seu email</h4>
              <p className="mb-2">
                Foi enviado um email de confirmação para <strong className="break-all">{formData.email}</strong>
              </p>
              <p className="text-xs text-info-gentle">
                • Verifique a sua caixa de entrada (e pasta de spam)<br/>
                • Clique no link de confirmação no email<br/>
                • Depois poderá iniciar sessão na sua conta
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Scoped CSS to hide native password reveal/clear and autofill icons */}
      <style>
        {`
          .no-password-reveal::-ms-reveal,
          .no-password-reveal::-ms-clear { 
            display: none; 
          }
          .no-password-reveal::-webkit-credentials-auto-fill-button { 
            visibility: hidden; 
            display: none !important; 
            pointer-events: none; 
            height: 0;
            width: 0;
            margin: 0;
          }
          .no-password-reveal::-webkit-contacts-auto-fill-button { 
            visibility: hidden; 
            display: none !important;
            pointer-events: none;
            height: 0;
            width: 0;
            margin: 0;
          }
          
          /* Ensure password text is always visible */
          .no-password-reveal {
            color: var(--deep-mocha) !important;
            -webkit-text-fill-color: var(--deep-mocha) !important;
          }
          
          .no-password-reveal::placeholder {
            color: var(--warm-taupe) !important;
            -webkit-text-fill-color: var(--warm-taupe) !important;
            opacity: 0.6;
          }
          
          /* Fix tabs overflow and responsiveness */
          [data-slot="tabs-list"] {
            width: 100% !important;
            display: grid !important;
            overflow: hidden;
          }
          
          [data-slot="tabs-trigger"] {
            overflow: hidden;
            text-overflow: ellipsis;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 0;
            flex: 1;
          }
          
          /* Ensure proper text wrapping on mobile */
          @media (max-width: 380px) {
            [data-slot="tabs-trigger"] {
              font-size: 0.75rem;
              line-height: 1.2;
              padding: 0.5rem 0.25rem;
            }
          }
          
          /* Fix scrollbar positioning in dialog */
          [data-slot="dialog-content"] {
            padding: 0 !important;
            overflow: hidden !important;
          }
          
          /* Ensure scrollbar is at the edge */
          [data-slot="dialog-content"] > div {
            scrollbar-gutter: stable;
          }
          
          /* Custom scrollbar styling for webkit browsers */
          [data-slot="dialog-content"] > div::-webkit-scrollbar {
            width: 8px;
          }
          
          [data-slot="dialog-content"] > div::-webkit-scrollbar-track {
            background: transparent;
            margin: 8px 0;
          }
          
          [data-slot="dialog-content"] > div::-webkit-scrollbar-thumb {
            background-color: var(--pale-clay-deep);
            border-radius: 4px;
            border: 2px solid transparent;
            background-clip: padding-box;
          }
          
          [data-slot="dialog-content"] > div::-webkit-scrollbar-thumb:hover {
            background-color: var(--pale-clay-darker);
          }
        `}
      </style>
      
      <Dialog key={isOpen ? 'open' : 'closed'} open={isOpen} onOpenChange={handleClose}>
        <DialogContent 
          className="sm:max-w-md w-full border-pale-clay-deep bg-porcelain shadow-clay-strong rounded-2xl p-0 max-h-[90vh] overflow-hidden"
        >
          <div 
            ref={dialogContentRef}
            className="max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-pale-clay-deep scrollbar-track-transparent hover:scrollbar-thumb-pale-clay-darker p-6"
          >
            <DialogHeader className="text-center pb-4">
              <div className="mx-auto w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center mb-4 shadow-burnt-peach flex-shrink-0">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <DialogTitle className="text-2xl font-semibold text-deep-mocha mb-2 text-center break-words">
                Bem-vindo ao ResideAI
              </DialogTitle>
              <DialogDescription className="text-warm-taupe leading-relaxed text-center break-words px-2">
                Encontra a tua casa ideal com tecnologia de ponta. Inicia sessão ou cria uma conta para começar.
              </DialogDescription>
            </DialogHeader>

            {renderMessage()}

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="w-full grid grid-cols-2 gap-1 bg-pale-clay-light rounded-xl p-1 border border-pale-clay-medium h-auto min-h-[40px]">
                <TabsTrigger 
                  value="signin" 
                  className="rounded-lg font-medium data-[state=active]:bg-clay-white data-[state=active]:text-deep-mocha transition-all duration-200 text-center text-xs sm:text-sm md:text-base focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-burnt-peach whitespace-normal sm:whitespace-nowrap py-2 px-2 h-auto min-h-[36px]"
                  disabled={isLoading}
                >
                  Iniciar Sessão
                </TabsTrigger>
                <TabsTrigger 
                  value="signup"
                  className="rounded-lg font-medium data-[state=active]:bg-clay-white data-[state=active]:text-deep-mocha transition-all duration-200 text-center text-xs sm:text-sm md:text-base focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-burnt-peach whitespace-normal sm:whitespace-nowrap py-2 px-2 h-auto min-h-[36px]"
                  disabled={isLoading}
                >
                  Criar Conta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="space-y-5 mt-6">
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-warm-taupe font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-taupe flex-shrink-0" />
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder="email@exemplo.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="pl-10 pr-4 border-pale-clay-deep focus:border-burnt-peach focus:ring-burnt-peach/20 rounded-xl bg-clay-white h-12 transition-all duration-200 text-left"
                        disabled={isLoading}
                        autoComplete="username"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-warm-taupe font-medium">Palavra-passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-taupe flex-shrink-0" />
                      <Input
                        id="signin-password"
                        type={showSignInPassword ? 'text' : 'password'}
                        placeholder="A tua palavra-passe"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="pl-10 pr-12 border-pale-clay-deep focus:border-burnt-peach focus:ring-burnt-peach/20 rounded-xl bg-clay-white h-12 no-password-reveal transition-all duration-200 text-left"
                        disabled={isLoading}
                        autoComplete="current-password"
                        autoCorrect="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-pale-clay-light rounded-lg transition-colors flex-shrink-0"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        disabled={isLoading}
                        aria-label={showSignInPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                      >
                        {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 gradient-primary hover:shadow-burnt-peach text-white font-medium border-0 rounded-xl transition-all duration-200 hover:scale-[1.02] text-center"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
                        A iniciar sessão...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />
                        Iniciar Sessão
                      </div>
                    )}
                  </Button>
                </form>

                <div className="text-center">
                  <Button 
                    type="button"
                    variant="ghost" 
                    className="text-sm text-warm-taupe hover:bg-pale-clay-light hover:text-white rounded-lg transition-colors"
                    disabled={isLoading}
                    onClick={() => {
                      onClose(); // Fechar o AuthModal
                      onOpenForgotPassword?.(); // Abrir o ForgotPasswordModal
                    }}
                  >
                    Esqueceste a palavra-passe?
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="signup" className="space-y-5 mt-6">
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-warm-taupe font-medium">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-taupe flex-shrink-0" />
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Joao Silva"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className="pl-10 pr-4 border-pale-clay-deep focus:border-burnt-peach focus:ring-burnt-peach/20 rounded-xl bg-clay-white h-12 transition-all duration-200 text-left"
                        disabled={isLoading}
                        autoComplete="name"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-warm-taupe font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-taupe flex-shrink-0" />
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="teu.email@exemplo.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="pl-10 pr-4 border-pale-clay-deep focus:border-burnt-peach focus:ring-burnt-peach/20 rounded-xl bg-clay-white h-12 transition-all duration-200 text-left"
                        disabled={isLoading}
                        autoComplete="email"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-warm-taupe font-medium">Palavra-passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-taupe flex-shrink-0" />
                      <Input
                        id="signup-password"
                        type={showSignUpPassword ? 'text' : 'password'}
                        placeholder="Mínimo 8 caracteres"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="pl-10 pr-12 border-pale-clay-deep focus:border-burnt-peach focus:ring-burnt-peach/20 rounded-xl bg-clay-white h-12 no-password-reveal transition-all duration-200 text-left"
                        disabled={isLoading}
                        autoComplete="new-password"
                        autoCorrect="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-pale-clay-light rounded-lg transition-colors flex-shrink-0"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                        disabled={isLoading}
                        aria-label={showSignUpPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                      >
                        {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-warm-taupe-light leading-relaxed text-center break-words px-2">
                      Deve conter: 1 maiúscula, 1 minúscula, 1 número e 1 caracter especial
                    </p>
                  </div>
   
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-warm-taupe font-medium">Confirmar Palavra-passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-taupe flex-shrink-0" />
                      <Input
                        id="signup-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirme a sua palavra-passe"
                        value={formData.confirmPassword}
                        onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                        className="pl-10 pr-12 border-pale-clay-deep focus:border-burnt-peach focus:ring-burnt-peach/20 rounded-xl bg-clay-white h-12 no-password-reveal transition-all duration-200 text-left"
                        disabled={isLoading}
                        autoComplete="new-password"
                        autoCorrect="off"
                        spellCheck={false}
                        data-lpignore="true"
                        data-1p-ignore="true"
                        data-bwignore="true"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-pale-clay-light rounded-lg transition-colors flex-shrink-0"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        disabled={isLoading}
                        aria-label={showConfirmPassword ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 justify-center">
                    <input
                      type="checkbox"
                      id="accept-terms"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 text-burnt-peach border-pale-clay-deep rounded focus:ring-burnt-peach/20 flex-shrink-0"
                      disabled={isLoading}
                    />
                    <Label htmlFor="accept-terms" className="text-xs text-warm-taupe leading-relaxed text-center break-words">
                      Aceito os{' '}
                      <a 
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-burnt-peach hover:text-burnt-peach-deep underline underline-offset-2" 
                      >
                        Termos de Uso
                      </a>{' '}
                      e a{' '}
                      <a 
                        href="/privacy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-burnt-peach hover:text-burnt-peach-deep underline underline-offset-2" 
                      >
                        Política de Privacidade
                      </a>
                    </Label>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 gradient-primary hover:shadow-burnt-peach text-white font-medium border-0 rounded-xl transition-all duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 text-center"
                    disabled={isLoading || !acceptTerms}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
                        A criar conta...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <Sparkles className="h-4 w-4 mr-2 flex-shrink-0" />
                        Criar Conta
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full bg-pale-clay-medium" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-porcelain px-3 text-warm-taupe font-medium">ou continuar com</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Container para o botão do Google */}
              <div 
                ref={googleButtonRef}
                className="w-full min-h-[48px] flex items-center justify-center"
              >
                {/* O botão do Google será renderizado aqui */}
                {!googleButtonRef.current && (
                  <div className="w-full h-12 border border-pale-clay-deep rounded-xl flex items-center justify-center text-warm-taupe bg-clay-white">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-warm-taupe border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm">Carregando Google...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div> {/* End of scrollable container */}
        </DialogContent>
      </Dialog>
    </>
  );
}
