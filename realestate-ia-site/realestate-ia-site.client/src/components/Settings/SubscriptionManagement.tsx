import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CreditCard, Calendar, TrendingUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { 
  getCurrentSubscription, 
  cancelSubscription,
  type SubscriptionDto 
} from '../../api/subscription.service';
import { logger } from '../../utils/logger';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Textarea } from '../ui/textarea';

export function SubscriptionManagement() {
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    setIsLoading(true);
    try {
      const sub = await getCurrentSubscription();
      setSubscription(sub);
      logger.info('Subscrição carregada', 'SUBSCRIPTION_MANAGEMENT');
    } catch (error) {
      logger.error('Erro ao carregar subscrição', 'SUBSCRIPTION_MANAGEMENT', error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelSubscription({
        reason: cancelReason || 'No reason provided',
        cancelImmediately: false
      });

      if (result.success) {
        toast.success('Subscrição cancelada', {
          description: 'A tua subscrição será cancelada no final do período atual.'
        });
        await loadSubscription();
      } else {
        throw new Error(result.message || 'Erro ao cancelar subscrição');
      }
    } catch (error) {
      logger.error('Erro ao cancelar subscrição', 'SUBSCRIPTION_MANAGEMENT', error as Error);
      toast.error('Erro ao cancelar subscrição', {
        description: error instanceof Error ? error.message : 'Tenta novamente'
      });
    } finally {
      setIsCancelling(false);
      setCancelReason('');
    }
  };

  const formatDate = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatAmount = (amount?: number, currency?: string) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: currency || 'EUR'
    }).format(amount / 100);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-success-strong text-white">Ativa</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500 text-white">Período de Teste</Badge>;
      case 'canceled':
        return <Badge className="bg-error-gentle text-white">Cancelada</Badge>;
      case 'past_due':
        return <Badge className="bg-warning-gentle text-white">Pagamento Pendente</Badge>;
      default:
        return <Badge variant="outline">{status || 'Desconhecido'}</Badge>;
    }
  };

  const getIntervalLabel = (interval?: string) => {
    switch (interval) {
      case 'month':
        return 'Mensal';
      case 'year':
        return 'Anual';
      default:
        return interval || 'N/A';
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-burnt-peach" />
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-burnt-peach-dark" />
            <span className="text-deep-mocha">Subscrição</span>
          </CardTitle>
          <CardDescription>
            Não tens uma subscrição ativa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              Subscreve um plano para aceder a funcionalidades premium
            </p>
            <Button
              onClick={() => window.location.href = '/pricing'}
              className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Ver Planos
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-burnt-peach-dark" />
              <span className="text-deep-mocha">Subscrição Ativa</span>
            </CardTitle>
            <CardDescription className="mt-2">
              Gere a tua subscrição e faturação
            </CardDescription>
          </div>
          {getStatusBadge(subscription.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Subscription Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Plano</p>
            <p className="text-lg font-semibold text-foreground">
              {getIntervalLabel(subscription.interval)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Valor</p>
            <p className="text-lg font-semibold text-foreground">
              {formatAmount(subscription.amount, subscription.currency)}
              <span className="text-sm text-muted-foreground font-normal">
                /{subscription.interval === 'month' ? 'mês' : 'ano'}
              </span>
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Início do Período
            </p>
            <p className="text-sm font-medium text-foreground">
              {formatDate(subscription.currentPeriodStart)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              Próxima Renovação
            </p>
            <p className="text-sm font-medium text-foreground">
              {formatDate(subscription.currentPeriodEnd)}
            </p>
          </div>
        </div>

        {/* Cancel at period end warning */}
        {subscription.cancelAtPeriodEnd && (
          <div className="bg-warning-soft border border-warning-gentle rounded-lg p-4">
            <p className="text-sm text-warning-strong font-medium">
              ⚠️ Subscrição será cancelada em {formatDate(subscription.currentPeriodEnd)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Podes continuar a usar as funcionalidades premium até essa data.
            </p>
          </div>
        )}

        {/* Actions */}
        {!subscription.cancelAtPeriodEnd && subscription.status === 'active' && (
          <div className="pt-4 border-t border-pale-clay-deep">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-error-gentle text-error-strong hover:bg-error-soft"
                >
                  Cancelar Subscrição
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar Subscrição</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tens a certeza que queres cancelar a tua subscrição? Vais perder acesso às funcionalidades premium no final do período atual ({formatDate(subscription.currentPeriodEnd)}).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Motivo do cancelamento (opcional)
                  </label>
                  <Textarea
                    placeholder="Ajuda-nos a melhorar. Porque estás a cancelar?"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isCancelling}>
                    Manter Subscrição
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-error-gentle hover:bg-error-strong"
                    onClick={handleCancelSubscription}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        A cancelar...
                      </>
                    ) : (
                      'Confirmar Cancelamento'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Upgrade option */}
        <div className="bg-pale-clay-light rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            Queres mudar de plano?{' '}
            <a href="/pricing" className="text-burnt-peach hover:text-burnt-peach-deep font-medium">
              Ver todos os planos
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
