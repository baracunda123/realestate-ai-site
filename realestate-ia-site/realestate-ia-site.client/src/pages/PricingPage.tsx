import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../api/client';
import { createSubscription, getCurrentSubscription, cancelSubscription, type SubscriptionDto } from '../api/subscription.service';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';

interface Feature {
  name: string;
  free: boolean | string;
  premium: boolean | string;
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
}

const features: Feature[] = [
  { name: 'Pesquisas ilimitadas', free: true, premium: true },
  { name: 'Modelo de IA', free: 'GPT-4o-mini', premium: 'GPT-4o' },
  { name: 'Histórico de pesquisas', free: true, premium: true },
  { name: 'Favoritos ilimitados', free: true, premium: true },
  { name: 'Área pessoal', free: true, premium: true },
  { name: 'Sessões de chat guardadas', free: true, premium: true },
  { name: 'Recomendações personalizadas', free: true, premium: true },
  { name: 'Respostas mais precisas', free: false, premium: true },
  { name: 'Análise detalhada de propriedades', free: false, premium: true },
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

  const isPremiumActive = activeSubscription && activeSubscription.status === 'active' && !activeSubscription.cancelAtPeriodEnd;
  const isFreeActive = !activeSubscription || activeSubscription.cancelAtPeriodEnd;

  return (
    <div className="min-h-screen bg-pure-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-semibold text-deep-mocha mb-4 tracking-tight">
            Escolhe o teu plano
          </h1>
          <p className="text-lg text-warm-taupe max-w-2xl mx-auto">
            Pesquisas ilimitadas. Cancela quando quiseres.
          </p>
        </div>

        {/* Plans Comparison */}
        <div className="bg-porcelain rounded-3xl p-8 mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Free Plan */}
            <div className="bg-pure-white rounded-2xl p-8 border border-pale-clay-deep">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-deep-mocha mb-2">Free</h2>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-semibold text-deep-mocha">€0</span>
                  <span className="text-warm-taupe">/mês</span>
                </div>
                <p className="text-sm text-warm-taupe">Modelo básico (GPT-4o-mini)</p>
              </div>
              
              <Button
                onClick={() => handleSubscribe({ id: 'free', name: 'Free', price: 0, interval: 'month' } as any)}
                disabled={loading === 'free' || isFreeActive}
                variant="outline"
                className="w-full mb-6 h-12 border-pale-clay-deep text-deep-mocha hover:bg-pale-clay-light"
              >
                {loading === 'free' ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    A processar...
                  </>
                ) : isFreeActive ? (
                  'Plano Atual'
                ) : (
                  'Mudar para Free'
                )}
              </Button>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-burnt-peach flex-shrink-0" />
                  <span className="text-warm-taupe">Pesquisas ilimitadas</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-burnt-peach flex-shrink-0" />
                  <span className="text-warm-taupe">Histórico e favoritos</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-burnt-peach flex-shrink-0" />
                  <span className="text-warm-taupe">Área pessoal</span>
                </div>
              </div>
            </div>

            {/* Premium Plan */}
            <div className="bg-gradient-to-br from-burnt-peach-lighter/20 to-burnt-peach/10 rounded-2xl p-8 border-2 border-burnt-peach relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-burnt-peach text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg">
                  Mais Popular
                </span>
              </div>
              
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-deep-mocha mb-2">Premium</h2>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-5xl font-semibold text-deep-mocha">€8</span>
                  <span className="text-warm-taupe">/mês</span>
                </div>
                <p className="text-sm text-burnt-peach-dark font-medium">Modelo avançado (GPT-4o)</p>
              </div>
              
              <Button
                onClick={() => handleSubscribe({ id: 'premium', name: 'Premium', price: 8, interval: 'month' })}
                disabled={loading === 'premium' || (isPremiumActive ?? false)}
                className="w-full mb-6 h-12 bg-burnt-peach hover:bg-burnt-peach-light text-white font-semibold shadow-lg"
              >
                {loading === 'premium' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A processar...
                  </>
                ) : isPremiumActive ? (
                  'Plano Atual'
                ) : (
                  'Upgrade para Premium'
                )}
              </Button>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-burnt-peach-dark flex-shrink-0" />
                  <span className="text-deep-mocha font-medium">Tudo do Free, mais:</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-burnt-peach-dark flex-shrink-0" />
                  <span className="text-warm-taupe">Respostas mais precisas e detalhadas</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-burnt-peach-dark flex-shrink-0" />
                  <span className="text-warm-taupe">Análise avançada de propriedades</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-burnt-peach-dark flex-shrink-0" />
                  <span className="text-warm-taupe">Suporte prioritário</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Comparison Table */}
        <div className="mb-16">
          <h3 className="text-2xl font-semibold text-deep-mocha mb-8 text-center">Comparação detalhada</h3>
          <div className="bg-porcelain rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-pale-clay-deep">
                  <th className="text-left p-6 text-sm font-semibold text-deep-mocha">Funcionalidade</th>
                  <th className="text-center p-6 text-sm font-semibold text-deep-mocha">Free</th>
                  <th className="text-center p-6 text-sm font-semibold text-deep-mocha">Premium</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, index) => (
                  <tr key={index} className="border-b border-pale-clay-deep last:border-0">
                    <td className="p-6 text-sm text-warm-taupe">{feature.name}</td>
                    <td className="p-6 text-center">
                      {typeof feature.free === 'boolean' ? (
                        feature.free ? (
                          <Check className="h-5 w-5 text-burnt-peach mx-auto" />
                        ) : (
                          <span className="text-pale-clay-deep">—</span>
                        )
                      ) : (
                        <span className="text-xs text-warm-taupe bg-pale-clay-light px-2 py-1 rounded">{feature.free}</span>
                      )}
                    </td>
                    <td className="p-6 text-center">
                      {typeof feature.premium === 'boolean' ? (
                        feature.premium ? (
                          <Check className="h-5 w-5 text-burnt-peach-dark mx-auto" />
                        ) : (
                          <span className="text-pale-clay-deep">—</span>
                        )
                      ) : (
                        <span className="text-xs text-burnt-peach-dark bg-burnt-peach-lighter/30 px-2 py-1 rounded font-medium">{feature.premium}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h3 className="text-2xl font-semibold text-deep-mocha mb-8 text-center">Perguntas Frequentes</h3>
          <div className="space-y-6">
            <div className="bg-porcelain rounded-xl p-6">
              <h4 className="font-semibold text-deep-mocha mb-2">Porquê pagar €8/mês?</h4>
              <p className="text-sm text-warm-taupe leading-relaxed">
                Com o Premium tens acesso ao modelo GPT-4o, que oferece respostas mais precisas, detalhadas e contextualizadas. É como ter um consultor imobiliário expert 24/7 por apenas €8/mês.
              </p>
            </div>
            <div className="bg-porcelain rounded-xl p-6">
              <h4 className="font-semibold text-deep-mocha mb-2">Posso cancelar a qualquer momento?</h4>
              <p className="text-sm text-warm-taupe leading-relaxed">
                Sim! Sem compromissos nem contratos. Cancela quando quiseres e continuarás a ter acesso Premium até ao fim do período pago.
              </p>
            </div>
            <div className="bg-porcelain rounded-xl p-6">
              <h4 className="font-semibold text-deep-mocha mb-2">Como funciona o pagamento?</h4>
              <p className="text-sm text-warm-taupe leading-relaxed">
                Pagamentos 100% seguros processados através do Stripe. Aceitamos todos os cartões de crédito e débito. Os teus dados nunca são armazenados nos nossos servidores.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
