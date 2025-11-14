import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Verificar se o utilizador já aceitou os cookies
    const hasAccepted = localStorage.getItem('cookiesAccepted');
    if (!hasAccepted) {
      // Mostrar banner após 1 segundo
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookiesAccepted', 'true');
    setIsVisible(false);
  };

  const handleReject = () => {
    // Mesmo que rejeite, guardar a escolha para não mostrar novamente
    // (Cookies essenciais continuam ativos para funcionamento básico)
    localStorage.setItem('cookiesAccepted', 'essential-only');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-black/95 to-black/90 backdrop-blur-sm border-t border-pale-clay-deep/20 animate-in slide-in-from-bottom duration-500">
      <div className="site-container">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Conteúdo */}
          <div className="flex items-start space-x-3 flex-1">
            <Cookie className="h-5 w-5 text-burnt-peach flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm text-white font-medium">
                Este site utiliza cookies
              </p>
              <p className="text-xs text-gray-300 leading-relaxed">
                Utilizamos cookies essenciais para o funcionamento do site e ferramentas de análise 
                para melhorar a sua experiência. Ao continuar, aceita a nossa{' '}
                <Link 
                  to="/privacy" 
                  className="text-burnt-peach hover:text-burnt-peach-deep underline underline-offset-2"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Política de Privacidade
                </Link>.
              </p>
            </div>
          </div>

          {/* Botões */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReject}
              className="flex-1 sm:flex-none text-white hover:bg-white/10 border border-white/20"
            >
              <X className="h-4 w-4 mr-2" />
              Apenas Essenciais
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="flex-1 sm:flex-none gradient-primary hover:shadow-burnt-peach text-white"
            >
              Aceitar Todos
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
