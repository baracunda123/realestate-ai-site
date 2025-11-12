import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Mail, AlertCircle, CheckCircle, Loader2, KeyRound } from 'lucide-react';
import { forgotPassword } from '../api/auth.service';
import { auth as authLogger } from '../utils/logger';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBackToAuth?: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose, onBackToAuth }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await forgotPassword({ email });
      setSuccess(true);
      setEmail('');
      
      // Fechar modal após 5 segundos
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 5000);
    } catch (err) {
      authLogger.error('Erro ao solicitar recuperação de palavra-passe', err as Error);
      setError('Erro ao processar pedido. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setEmail('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] max-w-[95vw] sm:w-full border-pale-clay-deep bg-porcelain shadow-clay-strong rounded-2xl p-0 max-h-[90vh] overflow-hidden">
        <div className="max-h-[90vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader className="text-center pb-4 sm:pb-6">
            <div className="mx-auto w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-burnt-peach to-burnt-peach-deep rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-burnt-peach flex-shrink-0">
              <KeyRound className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <DialogTitle className="text-xl sm:text-2xl font-semibold text-deep-mocha mb-2 px-2">
              Recuperar Palavra-passe
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-warm-taupe leading-relaxed px-2">
              Introduza o seu email e enviaremos um link para redefinir a sua palavra-passe.
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="bg-error-soft border border-error-gentle/30 rounded-xl p-3 sm:p-4 mb-4 shadow-clay-soft">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-error-gentle mt-0.5 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-error-strong flex-1 break-words">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-success-soft border border-success-gentle/30 rounded-xl p-3 sm:p-4 mb-4 shadow-clay-soft">
              <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-success-gentle flex-shrink-0" />
                <div className="text-xs sm:text-sm text-success-strong">
                  <p className="font-semibold mb-1 sm:mb-2">Email enviado!</p>
                  <p className="break-words px-2">
                    Se o email <strong className="break-all">{email || 'fornecido'}</strong> existir na nossa base de dados, 
                    receberá um link de recuperação em breve.
                  </p>
                  <p className="text-xs text-success-gentle mt-1 sm:mt-2">
                    Verifique a sua caixa de entrada e pasta de spam.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!success && (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-sm sm:text-base text-warm-taupe font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-warm-taupe flex-shrink-0" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    className="pl-10 pr-4 border-pale-clay-deep focus:border-burnt-peach focus:ring-burnt-peach/20 rounded-xl bg-clay-white h-11 sm:h-12 text-sm sm:text-base transition-all duration-200"
                    disabled={isLoading}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    handleClose();
                    onBackToAuth?.();
                  }}
                  className="w-full sm:flex-1 h-11 sm:h-12 text-sm sm:text-base border-pale-clay-deep hover:bg-pale-clay-light rounded-xl transition-all duration-200 order-2 sm:order-1"
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:flex-1 h-11 sm:h-12 text-sm sm:text-base gradient-primary hover:shadow-burnt-peach text-white font-medium border-0 rounded-xl transition-all duration-200 hover:scale-[1.02] order-1 sm:order-2"
                  disabled={isLoading || !email}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin flex-shrink-0" />
                      <span className="text-sm sm:text-base">A enviar...</span>
                    </div>
                  ) : (
                    <span className="text-sm sm:text-base">Enviar Link</span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
