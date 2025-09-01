import React from 'react';
import { Home, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-pale-clay border-t border-cocoa-taupe/20">
      <div className="site-container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 text-center md:text-left min-h-[120px] items-center">
          
          {/* Coluna 1 - Identidade */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 justify-center md:justify-start">
              <div className="w-8 h-8 bg-burnt-peach rounded-lg flex items-center justify-center">
                <Home className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-deep-mocha">
                HomeFinder AI
              </h3>
            </div>
            <p className="text-sm text-cocoa-taupe leading-relaxed">
              Encontre seu lar ideal
            </p>
          </div>

          {/* Coluna 2 - Contactos */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-deep-mocha uppercase tracking-wide">
              Suporte
            </h4>
            <div className="flex items-center space-x-2 justify-center md:justify-start">
              <Mail className="h-4 w-4 text-cocoa-taupe" />
              <a 
                href="mailto:support@homefinder.ai"
                className="text-sm text-cocoa-taupe hover:text-burnt-peach transition-colors duration-200"
              >
                support@homefinder.ai
              </a>
            </div>
          </div>

          {/* Coluna 3 - Legal */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-deep-mocha uppercase tracking-wide">
              Legal
            </h4>
            <div className="flex flex-col space-y-2 items-center md:items-start">
              <a 
                href="#privacy"
                className="text-sm text-cocoa-taupe hover:text-burnt-peach transition-colors duration-200"
              >
                Política de Privacidade
              </a>
              <a 
                href="#terms"
                className="text-sm text-cocoa-taupe hover:text-burnt-peach transition-colors duration-200"
              >
                Termos e Condições
              </a>
            </div>
          </div>
        </div>

        {/* Copyright - Linha inferior opcional */}
        <div className="mt-8 pt-6 border-t border-cocoa-taupe/10">
          <p className="text-center text-xs text-warm-taupe">
            © 2024 HomeFinder AI. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
