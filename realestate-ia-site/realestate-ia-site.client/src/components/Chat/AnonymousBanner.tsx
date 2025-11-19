import { Button } from '../ui/button';

interface AnonymousBannerProps {
  onSignUp: () => void;
}

export function AnonymousBanner({ onSignUp }: AnonymousBannerProps) {
  return (
    <div className="bg-muted/50 border border-border rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-accent/10 text-accent font-medium px-2.5 py-1 rounded-full">
              Modelo Básico
            </span>
            <span className="text-xs text-muted-foreground">GPT-4o-mini</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Cria uma conta gratuita para guardar histórico, favoritos e área pessoal.
          </p>
        </div>
        <Button 
          onClick={onSignUp}
          size="sm"
          className="bg-accent hover:bg-accent/90 text-accent-foreground font-medium whitespace-nowrap"
        >
          Criar Conta
        </Button>
      </div>
    </div>
  );
}