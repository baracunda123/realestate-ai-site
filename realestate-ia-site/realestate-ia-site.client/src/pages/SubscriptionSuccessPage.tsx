import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { verifyCheckoutSession, type CheckoutSessionData } from '../api/subscription.service';
import { getCurrentUser } from '../api/auth.service';
import { logger } from '../utils/logger';

export default function SubscriptionSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<CheckoutSessionData | null>(null);
  const sessionId = searchParams.get('session_id');
  const hasVerified = useRef(false);

  useEffect(() => {
    const verifySession = async () => {
      // Prevenir execução dupla (React Strict Mode)
      if (hasVerified.current) return;
      hasVerified.current = true;
      if (!sessionId) {
        setError('ID da sessão não encontrado');
        setLoading(false);
        return;
      }

      try {
        logger.info('Verificando sessão de checkout após redirect do Stripe', 'SUBSCRIPTION_SUCCESS');
        
        // Verificar sessão com o backend
        const result = await verifyCheckoutSession(sessionId);
        
        if (result.success && result.sessionData) {
          setSessionData(result.sessionData);
          
          // Recarregar dados do utilizador para atualizar estado da subscrição
          try {
            await getCurrentUser();
            logger.info('Dados do utilizador atualizados após pagamento', 'SUBSCRIPTION_SUCCESS');
          } catch (userError) {
            logger.warn('Não foi possível atualizar dados do utilizador', 'SUBSCRIPTION_SUCCESS');
          }
          
          toast.success('Subscrição ativada com sucesso!', {
            description: 'Bem-vindo ao plano Premium'
          });
        } else {
          setError(result.error || 'Pagamento não confirmado');
          toast.error('Erro ao verificar pagamento', {
            description: result.error || 'Tente novamente'
          });
        }
      } catch (err) {
        logger.error('Erro ao verificar sessão', 'SUBSCRIPTION_SUCCESS', err as Error);
        setError('Erro ao verificar pagamento. Por favor, contacte o suporte.');
        toast.error('Erro ao verificar pagamento');
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pale-clay-light via-porcelain to-pure-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-burnt-peach" />
              <p className="text-warm-taupe">A verificar o seu pagamento...</p>
              <p className="text-xs text-warm-taupe/70">Aguarde enquanto confirmamos com o Stripe</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pale-clay-light via-porcelain to-pure-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <CardTitle className="text-2xl text-deep-mocha">
              Erro na Verificação
            </CardTitle>
            <CardDescription>
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-800">
                Se o pagamento foi efetuado, a sua subscrição será ativada automaticamente em alguns minutos.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => navigate('/profile')}
                className="w-full bg-gradient-to-r from-burnt-peach to-warm-terracotta hover:opacity-90"
              >
                Ir para o Perfil
              </Button>
              <Button
                onClick={() => navigate('/pricing')}
                variant="outline"
                className="w-full"
              >
                Ver Planos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pale-clay-light via-porcelain to-pure-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-deep-mocha">
            Pagamento Confirmado!
          </CardTitle>
          <CardDescription>
            A sua subscrição Premium foi ativada com sucesso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-pale-clay-light p-4 rounded-lg space-y-2">
            <p className="text-sm text-warm-taupe">
              <strong>O que tens agora:</strong>
            </p>
            <ul className="text-sm text-warm-taupe space-y-1 list-disc list-inside">
              <li>Chat IA ilimitado</li>
              <li>Pesquisa de propriedades</li>
              <li>Favoritos ilimitados</li>
              <li>Alertas de baixa de preço</li>
              <li>Notificações no site</li>
              <li>Histórico de pesquisas</li>
              <li>Recomendações personalizadas</li>
            </ul>
          </div>

          {sessionData && (
            <div className="space-y-2">
              {sessionData.amountTotal && (
                <p className="text-sm text-warm-taupe text-center">
                  <strong>Valor pago:</strong> {(sessionData.amountTotal / 100).toFixed(2)} {sessionData.currency?.toUpperCase()}
                </p>
              )}
              {sessionData.customerEmail && (
                <p className="text-xs text-warm-taupe/70 text-center">
                  Recibo enviado para: {sessionData.customerEmail}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => navigate('/profile')}
              className="w-full bg-gradient-to-r from-burnt-peach to-warm-terracotta hover:opacity-90"
            >
              Ir para o Perfil
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              Voltar ao Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
