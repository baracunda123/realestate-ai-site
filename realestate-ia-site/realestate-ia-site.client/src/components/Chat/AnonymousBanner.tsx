import { Button } from '../ui/button';

interface AnonymousBannerProps {
  onSignUp: () => void;
}

export function AnonymousBanner({ onSignUp }: AnonymousBannerProps) {
  return (
    <div className="bg-porcelain border border-pale-clay-deep rounded-2xl p-5 mb-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs bg-burnt-peach/10 text-burnt-peach-dark font-medium px-2.5 py-1 rounded-full">
              Modelo Básico
            </span>
            <span className="text-xs text-warm-taupe">GPT-4o-mini</span>
          </div>
          <p className="text-sm text-warm-taupe">
            Cria uma conta gratuita para guardar histórico, favoritos e área pessoal.
          </p>
        </div>
        <Button 
          onClick={onSignUp}
          size="sm"
          className="bg-burnt-peach hover:bg-burnt-peach-light text-white font-medium whitespace-nowrap"
        >
          Criar Conta
        </Button>
      </div>
    </div>
  );
}
