import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { CheckCircle, XCircle, Loader2, Mail, AlertCircle } from 'lucide-react';
import { confirmEmail, resendConfirmationEmail, authUtils } from '../api/auth.service';
import { client as logger } from '../utils/logger';

type ConfirmationStatus = 'loading' | 'success' | 'error' | 'expired';

interface ConfirmEmailResponse {
  success: boolean;
  message: string;
  code?: string;
}

export function EmailConfirmation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConfirmationStatus>('loading');
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  
  // Ref para evitar dupla execução do useEffect (React StrictMode)
  const hasVerified = useRef(false);

  useEffect(() => {
    // Se já verificou, não executar novamente
    if (hasVerified.current) {
      return;
    }

    // Fazer logout se estiver logado (para garantir sessão limpa)
    if (authUtils.isAuthenticated()) {
      logger.info('Utilizador estava logado - fazendo logout para confirmação de email');
      authUtils.clearTokens();
    }

    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Link de confirmação inválido. Token ausente.');
        logger.error('Email confirmation: missing token');
        return;
      }

      try {
        logger.info('Iniciando confirmação de email...');
        const response = await confirmEmail({ token }) as ConfirmEmailResponse;

        if (response.success) {
          setStatus('success');
          setMessage(response.message || 'Email confirmado com sucesso!');
          logger.info('Email confirmado com sucesso');
        } else {
          if (response.code === 'INVALID_TOKEN') {
            setStatus('expired');
            setMessage(response.message || 'Link de confirmação inválido ou expirado.');
          } else {
            setStatus('error');
            setMessage(response.message || 'Falha na confirmação do email.');
          }
          logger.error('Falha na confirmação: ' + response.message);
        }
      } catch (error) {
        logger.error('Erro ao confirmar email', error as Error);
        const errorObj = error as { response?: { data?: { message?: string; code?: string } } };
        
        if (errorObj.response?.data?.code === 'INVALID_TOKEN') {
          setStatus('expired');
          setMessage(errorObj.response.data.message || 'Link de confirmação inválido ou expirado.');
        } else {
          setStatus('error');
          setMessage(errorObj.response?.data?.message || 'Erro ao confirmar email. Tente novamente.');
        }
      }
    };

    // Marcar como verificado antes de executar
    hasVerified.current = true;
    verifyEmail();
  }, [token]);

  const handleResendEmail = async () => {
    if (!resendEmail || !resendEmail.includes('@')) {
      setResendMessage('Por favor, insira um email válido.');
      return;
    }

    setIsResending(true);
    setResendMessage('');

    try {
      const response = await resendConfirmationEmail(resendEmail);
      setResendMessage(response.message || 'Um novo email de confirmação foi enviado!');
      logger.info('Email de confirmação reenviado');
    } catch (error) {
      logger.error('Erro ao reenviar email', error as Error);
      setResendMessage('Erro ao reenviar email. Tente novamente mais tarde.');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    navigate('/', { state: { openAuthModal: true, defaultTab: 'signin' } });
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-16 w-16 text-burnt-peach animate-spin" />
            <p className="text-warm-taupe text-lg">Verificando seu email...</p>
          </div>
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-20 h-20 rounded-full bg-success-soft flex items-center justify-center">
              <CheckCircle className="h-12 w-12 text-success-gentle" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-semibold text-deep-mocha">Email Confirmado!</h3>
              <p className="text-sm text-warm-taupe-light">Agora podes fazer login na tua conta.</p>
            </div>
            <Button 
              onClick={handleGoToLogin}
              className="gradient-primary hover:shadow-burnt-peach text-white font-medium"
            >
              Fazer Login
            </Button>
          </div>
        );

      case 'expired':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-20 h-20 rounded-full bg-warning-soft flex items-center justify-center">
              <AlertCircle className="h-12 w-12 text-warning-gentle" />
            </div>
            <div className="text-center space-y-2">
                <h3 className="text-2xl font-semibold text-deep-mocha">Link Inválido ou Expirado</h3>
              <p className="text-warm-taupe">{message}</p>
              <p className="text-sm text-warm-taupe-light">
                Solicite um novo link de confirmação para continuar.
              </p>
            </div>
            <div className="flex flex-col items-center space-y-3 w-full max-w-sm">
              <div className="w-full space-y-2">
                <Label htmlFor="resend-email" className="text-warm-taupe">Seu Email</Label>
                <Input
                  id="resend-email"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="border-pale-clay-deep focus:border-burnt-peach"
                  disabled={isResending}
                />
              </div>
              <Button 
                onClick={handleResendEmail}
                disabled={isResending || !resendEmail}
                className="w-full gradient-primary hover:shadow-burnt-peach text-white font-medium"
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Reenviando...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Reenviar Email de Confirmação
                  </>
                )}
              </Button>
              {resendMessage && (
                <p className={`text-sm ${resendMessage.includes('Erro') ? 'text-error-gentle' : 'text-success-gentle'}`}>
                  {resendMessage}
                </p>
              )}
              <Button 
                variant="ghost"
                onClick={handleGoHome}
                className="text-warm-taupe hover:bg-pale-clay-light"
              >
                Voltar para Início
              </Button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="w-20 h-20 rounded-full bg-error-soft flex items-center justify-center">
              <XCircle className="h-12 w-12 text-error-gentle" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-semibold text-deep-mocha">Erro na Confirmação</h3>
              <p className="text-warm-taupe">{message}</p>
            </div>
            <div className="flex flex-col items-center space-y-3 w-full max-w-sm">
              <div className="w-full space-y-2">
                <Label htmlFor="resend-email-error" className="text-warm-taupe">Seu Email</Label>
                <Input
                  id="resend-email-error"
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="border-pale-clay-deep focus:border-burnt-peach"
                  disabled={isResending}
                />
              </div>
              <Button 
                onClick={handleResendEmail}
                disabled={isResending || !resendEmail}
                className="w-full gradient-primary hover:shadow-burnt-peach text-white font-medium"
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Reenviando...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Reenviar Email de Confirmação
                  </>
                )}
              </Button>
              {resendMessage && (
                <p className={`text-sm text-center ${resendMessage.includes('Erro') ? 'text-error-gentle' : 'text-success-gentle'}`}>
                  {resendMessage}
                </p>
              )}
              <Button 
                variant="ghost"
                onClick={handleGoHome}
                className="text-warm-taupe hover:bg-pale-clay-light"
              >
                Voltar para Início
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-porcelain via-clay-white to-pale-clay-light flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-clay-strong border-pale-clay-deep">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-3xl font-bold text-deep-mocha">
            Confirmação de Email
          </CardTitle>
          <CardDescription className="text-warm-taupe">
            Validando sua conta ResideAI
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}

export default EmailConfirmation;
