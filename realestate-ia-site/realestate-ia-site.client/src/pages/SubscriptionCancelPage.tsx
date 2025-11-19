import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { XCircle } from 'lucide-react';

export default function SubscriptionCancelPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            Pagamento Cancelado
          </CardTitle>
          <CardDescription>
            O processo de pagamento foi cancelado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">
              Não se preocupe! Nenhum valor foi cobrado.
            </p>
            <p className="text-sm text-muted-foreground">
              Pode tentar novamente quando quiser fazer upgrade para o plano Premium.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => navigate('/pricing')}
              className="w-full bg-gradient-to-r from-accent to-primary hover:opacity-90"
            >
              Ver Planos Novamente
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