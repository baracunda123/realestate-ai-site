import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SubscriptionSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Simular verificação da sessão
    const timer = setTimeout(() => {
      setLoading(false);
      if (sessionId) {
        toast.success('Subscrição ativada com sucesso!', {
          description: 'Bem-vindo ao plano Premium'
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pale-clay-light via-porcelain to-pure-white flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-burnt-peach" />
              <p className="text-warm-taupe">A processar o seu pagamento...</p>
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
              <strong>O que acontece agora?</strong>
            </p>
            <ul className="text-sm text-warm-taupe space-y-1 list-disc list-inside">
              <li>Acesso imediato a todas as funcionalidades Premium</li>
              <li>2000 mensagens de chat por mês</li>
              <li>Análise de mercado com IA</li>
              <li>Suporte VIP 24/7</li>
            </ul>
          </div>

          {sessionId && (
            <p className="text-xs text-warm-taupe text-center">
              ID da Sessão: {sessionId.substring(0, 20)}...
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => navigate('/chat')}
              className="w-full bg-gradient-to-r from-burnt-peach to-warm-terracotta hover:opacity-90"
            >
              Começar a Usar
            </Button>
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="w-full"
            >
              Ir para Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
