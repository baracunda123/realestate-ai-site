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
  Phone, 
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

export function AuthModal({ isOpen, onClose, onSuccess, defaultTab = 'signin' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  // Ref para o container do botão do Google
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens/closes or tab changes
  useEffect(() => {
    if (isOpen) {
      logger.info('Modal de autenticação aberto');
      setActiveTab(defaultTab);
      resetForm();
      
      // Inicializar Google Auth quando o modal abrir
      googleAuthService.initialize().then(success => {
        if (success) {
          logger.info('Google Auth inicializado com sucesso');
          // Renderizar botão do Google
          if (googleButtonRef.current) {
            googleAuthService.renderButtonIn(
              googleButtonRef.current,
              handleGoogleSuccess,
              handleGoogleError
            );
          }
        } else {
          logger.error('Falha na inicialização do Google Auth');
        }
      }).catch(error => {
        logger.error('Erro na inicialização do Google Auth', error);
      });
    }
  }, [isOpen, defaultTab]);

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setShowPassword(false);
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
    setActiveTab(value as 'signin' | 'signup');
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
            <div className="text-sm text-error-strong flex-1">
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
            <p className="text-sm text-success-strong text-center flex-1">{success}</p>
          </div>
        </div>
      );
    }

    if (showEmailConfirmation) {
      return (
        <div className="bg-info-soft border border-info-gentle/30 rounded-xl p-4 mb-4 shadow-clay-soft">
          <div className="flex flex-col items-center text-center space-y-3">
            <MailCheck className="h-6 w-6 text-info-gentle" />
            <div className="text-sm text-info-strong">
              <h4 className="font-semibold mb-2">Confirmar o seu email</h4>
              <p className="mb-2">
                Foi enviado um email de confirmação para <strong>{formData.email}</strong>
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

  const renderPasswordInput = (id: string, placeholder: string, value: string, field: keyof FormData) => {
    const autoCompleteValue = id.includes('signin') ? 'current-password' : 'new-password';
    return (
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-taupe" />
        <Input
          id={id}
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(field, e.target.value)}
          className="pl-10 pr-12 border-pale-clay-deep focus:border-burnt-peach focus:ring-burnt-peach/20 rounded-xl bg-clay-white h-12 no-password-reveal transition-all duration-200 text-left"
          disabled={isLoading}
          autoComplete={autoCompleteValue}
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
          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-pale-clay-light rounded-lg transition-colors"
          onClick={() => setShowPassword(!showPassword)}
          disabled={isLoading}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    );
  };

  return (
    <>
      {/* Scoped CSS to hide native password reveal/clear and autofill icons */}
      <style>
        {`
          .no-password-reveal { -webkit-appearance: none; appearance: none; }
          .no-password-reveal::-ms-reveal,
          .no-password-reveal::-ms-clear { display: none; }
          .no-password-reveal::-webkit-textfield-decoration-container { display: none; }
          .no-password-reveal::-webkit-credentials-auto-fill-button { visibility: hidden; display: none; pointer-events: none; }
          .no-password-reveal::-webkit-contacts-auto-fill-button { visibility: hidden; display: none; pointer-events: none; }
          
          /* Estilo para o botão do Google */
          .google-button-container [role="button"] {
            width: 100% !important;
            height: 48px !important;
            border-radius: 12px !important;
            border: 1px solid #e2e8f0 !important;
            transition: all 0.2s ease !important;
          }
          
          .google-button-container [role="button"]:hover {
            border-color: #d97706 !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
            transform: translateY(-1px) !important;
          }
        `}
      </style>
      
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto scrollbar-hide border-pale-clay-deep bg-porcelain shadow-clay-strong rounded-2xl">
          <DialogHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center mb-4 shadow-burnt-peach">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <DialogTitle className="text-2xl font-semibold text-deep-mocha mb-2 text-center">
              Bem-vindo ao ResideAI
            </DialogTitle>
            <DialogDescription className="text-warm-taupe leading-relaxed text-center">
              Encontre a sua casa ideal com tecnologia de ponta. Inicie sessão ou crie uma nova conta para começar.
            </DialogDescription>
          </DialogHeader>

          {renderMessage()}

          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-pale-clay-light rounded-xl p-1 border border-pale-clay-medium">
              <TabsTrigger 
                value="signin" 
                className="rounded-lg font-medium data-[state=active]:bg-clay-white data-[state=active]:text-deep-mocha data-[state=active]:shadow-clay-soft transition-all duration-200 text-center"
                disabled={isLoading}
              >
                Iniciar Sessão
              </TabsTrigger>
              <TabsTrigger 
                value="signup"
                className="rounded-lg font-medium data-[state=active]:bg-clay-white data-[state=active]:text-deep-mocha data-[state=active]:shadow-clay-soft transition-all duration-200 text-center"
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
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-taupe" />
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="seu.email@exemplo.com"
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
                  {renderPasswordInput('signin-password', 'A sua palavra-passe', formData.password, 'password')}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 gradient-primary hover:shadow-burnt-peach text-white font-medium border-0 rounded-xl transition-all duration-200 hover:scale-[1.02] text-center"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A iniciar sessão...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Sparkles className="h-4 w-4 mr-2" />
                      Iniciar Sessão
                    </div>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <Button 
                  variant="ghost" 
                  className="text-sm text-warm-taupe hover:bg-pale-clay-light hover:text-deep-moca rounded-lg transition-colors"
                  disabled={isLoading}
                >
                  Esqueceu a palavra-passe?
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="space-y-5 mt-6">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-warm-taupe font-medium">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-taupe" />
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
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-taupe" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu.email@exemplo.com"
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
                  <Label htmlFor="signup-phone" className="text-warm-taupe font-medium">Telefone <span className="text-warm-taupe-light">(opcional)</span></Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-taupe" />
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="pl-10 pr-4 border-pale-clay-deep focus:border-burnt-peach focus:ring-burnt-peach/20 rounded-xl bg-clay-white h-12 transition-all duration-200 text-left"
                      disabled={isLoading}
                      autoComplete="tel"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-warm-taupe font-medium">Palavra-passe</Label>
                  {renderPasswordInput('signup-password', 'Mínimo 8 caracteres', formData.password, 'password')}
                  <p className="text-xs text-warm-taupe-light leading-relaxed text-center">
                    Deve conter: 1 maiúscula, 1 minúscula, 1 número e 1 caracter especial
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password" className="text-warm-taupe font-medium">Confirmar Palavra-passe</Label>
                  {renderPasswordInput('signup-confirm-password', 'Confirme a sua palavra-passe', formData.confirmPassword, 'confirmPassword')}
                </div>

                <div className="flex items-start space-x-3 justify-center">
                  <input
                    type="checkbox"
                    id="accept-terms"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-burnt-peach border-pale-clay-deep rounded focus:ring-burnt-peach/20"
                    disabled={isLoading}
                  />
                  <Label htmlFor="accept-terms" className="text-xs text-warm-taupe leading-relaxed text-center">
                    Aceito os{' '}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs text-burnt-peach hover:text-burnt-peach-deep underline-offset-2" 
                      disabled={isLoading}
                      type="button"
                    >
                      Termos de Uso
                    </Button>{' '}
                    e a{' '}
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-xs text-burnt-peach hover:text-burnt-peach-deep underline-offset-2" 
                      disabled={isLoading}
                      type="button"
                    >
                      Política de Privacidade
                    </Button>
                  </Label>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 gradient-primary hover:shadow-burnt-peach text-white font-medium border-0 rounded-xl transition-all duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 text-center"
                  disabled={isLoading || !acceptTerms}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      A criar conta...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <Sparkles className="h-4 w-4 mr-2" />
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
              className="google-button-container w-full min-h-[48px] flex items-center justify-center"
              style={{ minHeight: '48px' }}
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

        </DialogContent>
      </Dialog>
    </>
  );
}
