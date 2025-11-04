import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Check, Sparkles, TrendingUp, Zap, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import apiClient from '../api/client';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: 'month' | 'year';
  stripePriceId: string;
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
    description: 'Para começar a explorar',
    price: 0,
    interval: 'month',
    stripePriceId: '',
    chatLimit: 50,
    features: [
      '50 mensagens de chat por mês',
      'Pesquisa básica de propriedades',
      'Favoritos ilimitados',
      'Alertas de preço (até 5)',
      'Suporte por email'
    ],
    icon: <Sparkles className="h-6 w-6" />,
    color: 'from-gray-500 to-gray-600'
  },
  {
    id: 'basic',
    name: 'Básico',
    description: 'Ideal para quem procura regularmente',
    price: 9.99,
    interval: 'month',
    stripePriceId: 'price_basic_monthly', // TODO: Substituir pelo ID real do Stripe
    chatLimit: 500,
    features: [
      '500 mensagens de chat por mês',
      'Pesquisa avançada com IA',
      'Recomendações personalizadas',
      'Alertas de preço (até 20)',
      'Histórico de pesquisa',
      'Suporte prioritário'
    ],
    icon: <TrendingUp className="h-6 w-6" />,
    color: 'from-blue-500 to-blue-600'
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Para profissionais exigentes',
    price: 24.99,
    interval: 'month',
    stripePriceId: 'price_premium_monthly', // TODO: Substituir pelo ID real do Stripe
    chatLimit: 2000,
    popular: true,
    features: [
      '2000 mensagens de chat por mês',
      'Análise de mercado com IA',
      'Relatórios personalizados',
      'Alertas ilimitados',
      'Notificações em tempo real',
      'API de acesso',
      'Suporte VIP 24/7'
    ],
    icon: <Zap className="h-6 w-6" />,
    color: 'from-purple-500 to-purple-600'
  },
  {
    id: 'unlimited',
    name: 'Ilimitado',
    description: 'Uso sem limites',
    price: 49.99,
    interval: 'month',
    stripePriceId: 'price_unlimited_monthly', // TODO: Substituir pelo ID real do Stripe
    chatLimit: -1,
    features: [
      'Conversas ilimitadas com IA',
      'Todas as funcionalidades Premium',
      'Consultor pessoal dedicado',
      'Insights de mercado exclusivos',
      'Acesso antecipado a novidades',
      'Treinamento personalizado',
      'Suporte dedicado 24/7'
    ],
    icon: <Crown className="h-6 w-6" />,
    color: 'from-amber-500 to-amber-600'
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

      // Criar sessão de checkout no Stripe
      const response = await apiClient.post<{ success: boolean; checkoutUrl: string }>(
        '/api/subscription/create',
        { priceId: plan.stripePriceId }
      );

      if (response.success && response.checkoutUrl) {
        // Redirecionar para Stripe Checkout
        window.location.href = response.checkoutUrl;
      } else {
        throw new Error('Erro ao criar sessão de pagamento');
      }
    } catch (error: any) {
      console.error('Erro ao criar subscrição:', error);
      toast.error('Erro ao processar pagamento', {
        description: error?.response?.data?.error || 'Tente novamente mais tarde'
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
            Escolha o Plano Perfeito
          </h1>
          <p className="text-xl text-warm-taupe max-w-2xl mx-auto">
            Desbloqueie todo o potencial da IA imobiliária. Sem contratos, cancele quando quiser.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
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
              <h3 className="font-semibold text-deep-mocha mb-2">O que acontece se exceder o limite?</h3>
              <p className="text-sm text-warm-taupe">
                Quando atingir o limite de mensagens, poderá fazer upgrade imediatamente ou aguardar pela renovação mensal do plano.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-deep-mocha mb-2">Posso cancelar a qualquer momento?</h3>
              <p className="text-sm text-warm-taupe">
                Sim! Pode cancelar a sua subscrição a qualquer momento. Continuará a ter acesso até ao fim do período pago.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-deep-mocha mb-2">Como funciona o pagamento?</h3>
              <p className="text-sm text-warm-taupe">
                Os pagamentos são processados de forma segura através do Stripe. Aceitamos cartões de crédito e débito.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-deep-mocha mb-2">Posso mudar de plano?</h3>
              <p className="text-sm text-warm-taupe">
                Sim! Pode fazer upgrade ou downgrade do seu plano a qualquer momento. As alterações serão ajustadas proporcionalmente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
