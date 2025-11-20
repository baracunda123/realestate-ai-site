import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

interface LegalPageLayoutProps {
  children: ReactNode;
}

export function LegalPageLayout({ children }: LegalPageLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="site-container py-8">
        {/* Botão Voltar */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Início
          </Button>
        </div>

        {/* Conteúdo */}
        <div className="bg-card rounded-xl shadow-strong border border-border p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}