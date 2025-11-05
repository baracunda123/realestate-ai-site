import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Check, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../api/client';
import { createSubscription } from '../api/subscription.service';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
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
    name: 'Gratuito',
    description: 'Ideal para começar',
    price: 0,
    interval: 'month',
    chatLimit: 50,
    features: [
      '50 mensagens de chat IA por mês',
      'Pesquisa de propriedades',
      'Favoritos ilimitados',
      'Alertas de baixa de preço',
      'Notificações no site',
      'Histórico de pesquisas',
      'Recomendações personalizadas'
    ],
    icon: <Sparkles className="h-6 w-6" />,
    color: 'from-gray-500 to-gray-600'
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Conversas ilimitadas com IA',
    price: 8,
    interval: 'month',
    chatLimit: -1,
    popular: true,
    features: [
      '✨ Chat IA ilimitado',
      'Pesquisa de propriedades',
      'Favoritos ilimitados',
      'Alertas de baixa de preço',
      'Notificações no site',
      'Histórico de pesquisas',
      'Recomendações personalizadas'
    ],
    icon: <Zap className="h-6 w-6" />,
    color: 'from-purple-500 to-purple-600'
  }
];

export function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubscribe = async (plan: PricingPlan) => {
    if (plan.id === 'free') {
      toast.info('Você já está no plano gratuito');
      return;
    }

    setLoading(plan.id);

    try {
      // Verificar se usuário está autenticado
      if (!apiClient.isAuthenticated()) {
        toast.error('Faça login para continuar', {
          description: 'é necessário estar autenticado para fazer upgrade'
        });
        navigate('/');
        return;
      }

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pale-clay-light via-porcelain to-pure-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-deep-mocha mb-4">
            Encontre a Casa Perfeita com IA
          </h1>
          <p className="text-xl text-warm-taupe max-w-2xl mx-auto">
            Chat ilimitado com IA por apenas €8/mês. Sem contratos, cancele quando quiser.
          </p>
          <p className="text-sm text-warm-taupe mt-2">
            💡 Apenas €8/mês para ter um assistente imobiliário IA sempre disponível
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
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
                <CardDescription className="text-warm-taupe">{plan.description}</CardDescription>
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
                  disabled={loading === plan.id || plan.id === 'free'}
                  className={`w-full ${
                    plan.popular
                      ? 'bg-burnt-peach hover:bg-burnt-peach-light text-deep-mocha'
                      : 'bg-pale-clay hover:bg-pale-clay-deep text-deep-mocha'
                  } font-semibold`}
                >
                  {loading === plan.id ? (
                    <>
                      <span className="animate-spin mr-2">?</span>
                      A processar...
                    </>
                  ) : plan.id === 'free' ? (
                    'Plano Atual'
                  ) : (
                    'Começar Agora'
                  )}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ / Additional Info */}
        <Card className="border border-pale-clay-deep">
          <CardHeader>
            <CardTitle className="text-deep-mocha">Perguntas Frequentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-deep-mocha mb-2">Porquê pagar €8/mês?</h3>
              <p className="text-sm text-warm-taupe">
                Com o Premium tem conversas ilimitadas com a nossa IA especializada em imobiliário. Pergunte o que quiser, quantas vezes quiser, sem limites. É como ter um consultor imobiliário 24/7 por apenas €8/mês.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-deep-mocha mb-2">O que acontece se exceder o limite no plano gratuito?</h3>
              <p className="text-sm text-warm-taupe">
                Quando atingir as 50 mensagens, pode fazer upgrade imediatamente para continuar a usar o chat, ou aguardar pela renovação mensal do plano gratuito.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-deep-mocha mb-2">Posso cancelar a qualquer momento?</h3>
              <p className="text-sm text-warm-taupe">
                Sim! Sem compromissos nem contratos. Cancele quando quiser e continuará a ter acesso Premium até ao fim do período pago.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-deep-mocha mb-2">Como funciona o pagamento?</h3>
              <p className="text-sm text-warm-taupe">
                Pagamentos 100% seguros processados através do Stripe. Aceitamos todos os cartões de crédito e débito. Os seus dados nunca são armazenados nos nossos servidores.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
