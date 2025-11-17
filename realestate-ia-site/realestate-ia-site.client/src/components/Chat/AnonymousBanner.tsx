import { Info, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';

interface AnonymousBannerProps {
  onSignUp: () => void;
}

export function AnonymousBanner({ onSignUp }: AnonymousBannerProps) {
  return (
    <div className="bg-gradient-to-r from-warning-soft to-burnt-peach-lighter/30 border border-burnt-peach/30 rounded-xl p-4 mb-4 shadow-clay-soft">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Info className="h-5 w-5 text-burnt-peach-dark" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-burnt-peach/20 text-burnt-peach-darker font-medium px-2 py-0.5 rounded-full">
              Pesquisas Ilimitadas
            </span>
          </div>
          <p className="text-sm text-warm-taupe-dark font-medium">
            Estás a usar o modelo básico (GPT-4o-mini). Cria uma conta para desbloquear:
          </p>
          <ul className="text-sm text-warm-taupe space-y-1 ml-4">
            <li className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-burnt-peach" />
              <span><strong className="text-deep-mocha">Histórico</strong> de pesquisas guardado</span>
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-burnt-peach" />
              <span><strong className="text-deep-mocha">Favoritos</strong> e área pessoal</span>
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-burnt-peach" />
              <span><strong className="text-deep-mocha">Upgrade para Premium</strong> (€8/mês) → GPT-4o</span>
            </li>
          </ul>
          <Button 
            onClick={onSignUp}
            size="sm"
            className="mt-2 bg-burnt-peach hover:bg-burnt-peach-light text-white shadow-burnt-peach"
          >
            Criar Conta Gratuita
          </Button>
        </div>
      </div>
    </div>
  );
}
