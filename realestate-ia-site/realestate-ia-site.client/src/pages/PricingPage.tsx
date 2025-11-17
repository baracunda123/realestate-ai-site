import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Check, Sparkles, Zap, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../api/client';
import { createSubscription, getCurrentSubscription, cancelSubscription, type SubscriptionDto } from '../api/subscription.service';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  chatLimit: number;
  icon: React.ReactNode;
  popular?: boolean;
  color: string;
}

const plans: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    chatLimit: -1, // Ilimitado
    features: [
      'Pesquisas ilimitadas',
      'Modelo básico (GPT-4o-mini)',
      'Histórico completo de pesquisas',
      'Favoritos ilimitados',
      'Área pessoal',
      'Sessões de chat guardadas',
      'Recomendações personalizadas'
    ],
    icon: <Sparkles className="h-6 w-6" />,
    color: 'from-cocoa-taupe-light to-cocoa-taupe'
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 8,
    interval: 'month',
    chatLimit: -1, // Ilimitado
    popular: true,
    features: [
      'Pesquisas ilimitadas',
      'Modelo avançado (GPT-4o)',
      'Respostas excelentes e detalhadas',
      'Histórico completo de pesquisas',
      'Favoritos ilimitados',
      'Área pessoal',
      'Sessões de chat guardadas',
      'Recomendações personalizadas'
    ],
    icon: <Zap className="h-6 w-6" />,
    color: 'from-burnt-peach to-burnt-peach-dark'
  }
];

export function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<SubscriptionDto | null>(null);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        // Carregar subscrição ativa real do Stripe
        const subscription = await getCurrentSubscription();
        setActiveSubscription(subscription);
      } catch (error) {
        console.error('Erro ao carregar subscrição:', error);
      }
    };

    if (apiClient.isAuthenticated()) {
      loadSubscription();
    }
  }, []);

  const handleSubscribe = async (plan: PricingPlan) => {
    // Verificar se usuário está autenticado
    if (!apiClient.isAuthenticated()) {
      toast.error('Faça login para continuar', {
        description: 'é necessário estar autenticado para gerir subscrições'
      });
      navigate('/');
      return;
    }

    // Se clicar no plano gratuito
    if (plan.id === 'free') {
      // Verificar se tem subscrição Premium ativa
      if (activeSubscription && activeSubscription.status === 'active' && !activeSubscription.cancelAtPeriodEnd) {
        // Mostrar diálogo de confirmação para cancelar
        setShowDowngradeDialog(true);
        return;
      } else {
        // Já está no plano gratuito ou subscrição já está cancelada
        toast.info('Você já está no plano gratuito', {
          description: activeSubscription?.cancelAtPeriodEnd 
            ? 'A tua subscrição Premium será cancelada no final do período atual.'
            : undefined
        });
        return;
      }
    }

    // Plano Premium
    setLoading(plan.id);

    try {
      // Criar sessão de checkout no Stripe usando o serviço
      const result = await createSubscription(plan.id);

      if (result.success && result.checkoutUrl) {
        // Redirecionar para Stripe Checkout
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error(result.error || 'Erro ao criar sessão de pagamento');
      }
    } catch (error: any) {
      console.error('Erro ao criar subscrição:', error);
      toast.error('Erro ao processar pagamento', {
        description: error?.response?.data?.error || error?.message || 'Tente novamente mais tarde'
      });
    } finally {
      setLoading(null);
    }
  };

  const handleDowngradeToFree = async () => {
    setIsCancelling(true);
    try {
      const result = await cancelSubscription({
        reason: 'Downgrade to free plan',
        comment: 'User requested downgrade from pricing page'
      });

      if (result.success) {
        toast.success('Subscrição cancelada com sucesso', {
          description: 'Continuarás a ter acesso Premium até ao final do período atual. Depois voltarás ao plano gratuito.'
        });
        
        // Recarregar dados
        const subscription = await getCurrentSubscription();
        setActiveSubscription(subscription);
        
        setShowDowngradeDialog(false);
      } else {
        throw new Error(result.error || 'Erro ao cancelar subscrição');
      }
    } catch (error: any) {
      console.error('Erro ao cancelar subscrição:', error);
      toast.error('Erro ao cancelar subscrição', {
        description: error?.response?.data?.error || error?.message || 'Tente novamente mais tarde'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pale-clay-light via-porcelain to-pure-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-deep-mocha mb-4">
            Encontre a Casa Perfeita com IA
          </h1>
          <p className="text-xl text-warm-taupe max-w-2xl mx-auto">
            Chat ilimitado com IA avançada por apenas €8/mês. Sem contratos, cancele quando quiser.
          </p>
          <p className="text-sm text-warm-taupe mt-2">
            Upgrade para Premium e tenha acesso a respostas mais inteligentes e precisas
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          {plans.map((plan) => (
            <Card 
              key={plan.id}
              className={`relative flex flex-col ${
                plan.popular 
                  ? 'border-2 border-burnt-peach shadow-burnt-peach' 
                  : 'border border-pale-clay-deep'
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-burnt-peach text-deep-mocha">
                  Mais Popular
                </Badge>
              )}

              <CardHeader className="pb-4">
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${plan.color} flex items-center justify-center text-white mb-4`}>
                  {plan.icon}
                </div>
                <CardTitle className="text-2xl text-deep-mocha">{plan.name}</CardTitle>
              </CardHeader>

              <CardContent className="flex-1 space-y-4">
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-deep-mocha">
                      €{plan.price.toFixed(2)}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-warm-taupe">/{plan.interval === 'month' ? 'mês' : 'ano'}</span>
                    )}
                  </div>
                  <p className="text-sm text-warm-taupe">
                    {plan.chatLimit === -1 
                      ? 'Chat ilimitado' 
                      : `${plan.chatLimit} mensagens/mês`}
                  </p>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-burnt-peach flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-warm-taupe">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={
                    loading === plan.id || 
                    (plan.id === 'premium' && activeSubscription && activeSubscription.status === 'active' && !activeSubscription.cancelAtPeriodEnd) ||
                    (plan.id === 'free' && !activeSubscription)
                  }
                  className={`w-full ${
                    plan.popular
                      ? 'bg-burnt-peach hover:bg-burnt-peach-light text-deep-mocha hover:text-white'
                      : 'bg-pale-clay hover:bg-pale-clay-deep text-deep-mocha hover:text-white'
                  } font-semibold`}
                >
                  {loading === plan.id ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      A processar...
                    </>
                  ) : plan.id === 'premium' && activeSubscription && activeSubscription.status === 'active' && !activeSubscription.cancelAtPeriodEnd ? (
                    'Plano Atual'
                  ) : plan.id === 'free' && activeSubscription && activeSubscription.status === 'active' && !activeSubscription.cancelAtPeriodEnd ? (
                    'Mudar para Gratuito'
                  ) : plan.id === 'free' && (!activeSubscription || activeSubscription.cancelAtPeriodEnd) ? (
                    'Plano Atual'
                  ) : (
                    'Começar Agora'
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Downgrade Dialog */}
        <AlertDialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning-strong" />
                Cancelar Plano Premium?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Tens atualmente uma subscrição <strong>Premium ativa</strong>. Para mudar para o plano gratuito, precisas primeiro cancelar a tua subscrição atual.
                </p>
                <p className="text-sm">
                  Ao cancelar:
                </p>
                <ul className="text-sm list-disc list-inside space-y-1 ml-2">
                  <li>Continuarás a ter acesso Premium até <strong>{activeSubscription?.currentPeriodEnd ? new Date(activeSubscription.currentPeriodEnd).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }) : 'ao final do período'}</strong></li>
                  <li>Depois voltarás automaticamente ao plano gratuito (50 mensagens/mês)</li>
                  <li>Não serás cobrado novamente</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isCancelling}>
                Manter Premium
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDowngradeToFree}
                disabled={isCancelling}
                className="bg-warning-gentle hover:bg-warning-strong text-deep-mocha hover:text-white"
              >
                {isCancelling ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    A cancelar...
                  </>
                ) : (
                  'Confirmar Cancelamento'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* FAQ / Additional Info */}
        <Card className="border border-pale-clay-deep">
          <CardHeader>
            <CardTitle className="text-deep-mocha">Perguntas Frequentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-deep-mocha mb-2">Porquê pagar €8/mês?</h3>
              <p className="text-sm text-warm-taupe">
                Com o Premium tens conversas ilimitadas com a nossa IA especializada em imobiliário, usando tecnologia avançada para respostas mais precisas, detalhadas e contextualizadas. Pergunte o que quiseres, quantas vezes quiseres, sem limites. É como ter um consultor imobiliário expert 24/7 por apenas €8/mês.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-deep-mocha mb-2">O que acontece se exceder o limite no plano gratuito?</h3>
              <p className="text-sm text-warm-taupe">
                Quando atingir as 50 mensagens, podes fazer upgrade imediatamente para continuar a usar o chat, ou aguardar pela renovação mensal do plano gratuito.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-deep-mocha mb-2">Posso cancelar a qualquer momento?</h3>
              <p className="text-sm text-warm-taupe">
                Sim! Sem compromissos nem contratos. Cancela quando quiseres e continuarás a ter acesso Premium até ao fim do período pago.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-deep-mocha mb-2">Como funciona o pagamento?</h3>
              <p className="text-sm text-warm-taupe">
                Pagamentos 100% seguros processados através do Stripe. Aceitamos todos os cartões de crédito e débito. Os teus dados nunca são armazenados nos nossos servidores.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
