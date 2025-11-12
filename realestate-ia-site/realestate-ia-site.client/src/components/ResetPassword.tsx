import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CheckCircle, XCircle, Loader2, Lock, Eye, EyeOff, KeyRound, AlertCircle } from 'lucide-react';
import apiClient from '../api/client';
import { client as logger } from '../utils/logger';
import { authUtils } from '../api/auth.service';

type ResetStatus = 'idle' | 'loading' | 'success' | 'error';

interface ResetPasswordResponse {
  success: boolean;
  message: string;
  errors?: string[];
}

export function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ResetStatus>('idle');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showValidationError, setShowValidationError] = useState(false);

  // Validação de força da palavra-passe
  const validatePasswordStrength = (pwd: string) => {
    const hasMinLength = pwd.length >= 8;
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(pwd);
    
    return {
      isValid: hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar,
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar
    };
  };

  const passwordValidation = validatePasswordStrength(password);

  // Fazer logout quando a página carregar (para garantir que não está logado)
  useEffect(() => {
    const clearSession = () => {
      // Verificar se está logado
      if (authUtils.isAuthenticated()) {
        logger.info('Utilizador estava logado - fazendo logout para reset de palavra-passe');
        authUtils.clearTokens();
        // Não redirecionar, apenas limpar tokens
      }
    };

    clearSession();
  }, []); // Executar apenas uma vez quando o componente montar

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setStatus('error');
      setMessage('Link de recuperação inválido. Token ausente.');
      return;
    }

    // Validar força da palavra-passe
    if (!passwordValidation.isValid) {
      setShowValidationError(true);
      return;
    }

    if (password !== confirmPassword) {
      setErrors(['As palavras-passe não coincidem']);
      setShowValidationError(false);
      return;
    }

    setStatus('loading');
    setErrors([]);
    setShowValidationError(false);

    try {
      logger.info('Iniciando reset de palavra-passe...');
      const response = await apiClient.post<ResetPasswordResponse>('/api/auth/reset-password', {
        token,
        password,
        confirmPassword
      });

      if (response.success) {
        setStatus('success');
        setMessage(response.message || 'Palavra-passe redefinida com sucesso!');
        logger.info('Palavra-passe redefinida com sucesso');
        
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          navigate('/', { state: { openAuthModal: true, defaultTab: 'signin' } });
        }, 3000);
      } else {
        setStatus('error');
        setMessage(response.message || 'Erro ao redefinir palavra-passe');
        setErrors(response.errors || []);
        logger.error('Falha no reset: ' + response.message);
      }
    } catch (error) {
      logger.error('Erro ao redefinir palavra-passe', error as Error);
      const errorObj = error as { response?: { data?: { message?: string; errors?: string[] } } };
      
      setStatus('error');
      setMessage(errorObj.response?.data?.message || 'Erro ao redefinir palavra-passe. Tente novamente.');
      setErrors(errorObj.response?.data?.errors || []);
    }
  };

  const handleGoToLogin = () => {
    navigate('/', { state: { openAuthModal: true, defaultTab: 'signin' } });
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const renderContent = () => {
    if (status === 'success') {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
          <div className="w-20 h-20 rounded-full bg-success-soft flex items-center justify-center">
            <CheckCircle className="h-12 w-12 text-success-gentle" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-semibold text-deep-mocha">Palavra-passe Redefinida!</h3>
            <p className="text-sm text-warm-taupe-light">{message}</p>
            <p className="text-xs text-warm-taupe-light">A redirecionar para o login...</p>
          </div>
          <Button 
            onClick={handleGoToLogin}
            className="gradient-primary hover:shadow-burnt-peach text-white font-medium"
          >
            Ir para Login
          </Button>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
          <div className="w-20 h-20 rounded-full bg-error-soft flex items-center justify-center">
            <XCircle className="h-12 w-12 text-error-gentle" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-semibold text-deep-mocha">Erro ao Redefinir</h3>
            <p className="text-warm-taupe">{message}</p>
            {errors.length > 0 && (
              <ul className="text-sm text-error-gentle list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={handleGoHome}
              className="border-pale-clay-deep hover:bg-pale-clay-light"
            >
              Voltar para Início
            </Button>
            <Button 
              onClick={() => {
                setStatus('idle');
                setPassword('');
                setConfirmPassword('');
                setErrors([]);
              }}
              className="gradient-primary hover:shadow-burnt-peach text-white font-medium"
            >
              Tentar Novamente
            </Button>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-6 py-6" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-warm-taupe font-medium">
            Nova Palavra-passe
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-taupe" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setShowValidationError(false);
                setErrors([]);
              }}
              className="pl-10 pr-12 border-pale-clay-deep focus:border-burnt-peach focus:ring-burnt-peach/20 rounded-xl bg-clay-white h-12 no-password-reveal"
              disabled={status === 'loading'}
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
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-pale-clay-light rounded-lg"
              onClick={() => setShowPassword(!showPassword)}
              disabled={status === 'loading'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          
          {/* Aviso de validação de palavra-passe */}
          {showValidationError && !passwordValidation.isValid && (
            <div className="bg-warning-soft border border-warning-gentle/30 rounded-xl p-3 mt-2">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-warning-gentle mt-0.5 flex-shrink-0" />
                <div className="text-xs text-warning-strong">
                  <p className="font-semibold mb-1">
                    {password.length < 8 
                      ? `Aumente este texto para 8 caracteres ou mais (está a utilizar ${password.length} caracteres).`
                      : 'A palavra-passe não cumpre os requisitos de segurança.'
                    }
                  </p>
                  <p className="text-warning-gentle">Deve conter: 1 maiúscula, 1 minúscula, 1 número e 1 caracter especial</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-warm-taupe font-medium">
            Confirmar Palavra-passe
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-taupe" />
            <Input
              id="confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Confirme a sua palavra-passe"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors([]);
              }}
              className="pl-10 pr-12 border-pale-clay-deep focus:border-burnt-peach focus:ring-burnt-peach/20 rounded-xl bg-clay-white h-12 no-password-reveal"
              disabled={status === 'loading'}
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
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-pale-clay-light rounded-lg"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={status === 'loading'}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="bg-error-soft border border-error-gentle/30 rounded-xl p-4">
            <ul className="text-sm text-error-strong list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <Button 
          type="submit" 
          className="w-full h-12 gradient-primary hover:shadow-burnt-peach text-white font-medium border-0 rounded-xl transition-all duration-200 hover:scale-[1.02]"
          disabled={status === 'loading' || !password || !confirmPassword}
        >
          {status === 'loading' ? (
            <div className="flex items-center justify-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              A redefinir...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <KeyRound className="h-4 w-4 mr-2" />
              Redefinir Palavra-passe
            </div>
          )}
        </Button>

        <Button 
          type="button"
          variant="ghost"
          onClick={handleGoHome}
          className="w-full text-warm-taupe hover:bg-pale-clay-light"
          disabled={status === 'loading'}
        >
          Cancelar
        </Button>
      </form>
    );
  };

  return (
    <>
      {/* Scoped CSS to hide native password reveal icons */}
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
        `}
      </style>
      
      <div className="min-h-screen bg-gradient-to-br from-porcelain via-clay-white to-pale-clay-light flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-clay-strong border-pale-clay-deep">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-burnt-peach to-burnt-peach-deep rounded-2xl flex items-center justify-center mb-4 shadow-burnt-peach">
            <KeyRound className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-deep-mocha">
            Redefinir Palavra-passe
          </CardTitle>
          <CardDescription className="text-warm-taupe">
            Crie uma nova palavra-passe segura para a sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
    </>
  );
}

export default ResetPassword;
