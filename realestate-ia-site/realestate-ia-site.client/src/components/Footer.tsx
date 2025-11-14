import { Home, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full bg-pale-clay border-t border-cocoa-taupe/20">
      <div className="site-container py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          
          {/* Logo e Descrição */}
          <div className="space-y-3 text-center md:text-left">
            <div className="flex items-center space-x-2 justify-center md:justify-start">
              <div className="w-8 h-8 bg-burnt-peach rounded-lg flex items-center justify-center">
                <Home className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-deep-mocha">
                ResideAI
              </h3>
            </div>
            <p className="text-sm text-cocoa-taupe max-w-xs mx-auto md:mx-0">
              Encontra o teu lar ideal com tecnologia de inteligência artificial
            </p>
          </div>

          {/* Links Úteis */}
          <div className="space-y-3 text-center md:text-left">
            <h4 className="text-sm font-medium text-deep-mocha">
              Links Úteis
            </h4>
            <div className="flex flex-col space-y-2">
              <Link 
                to="/privacy"
                className="text-sm text-cocoa-taupe hover:text-burnt-peach transition-colors duration-200 text-center md:text-left"
              >
                Política de Privacidade
              </Link>
              <Link 
                to="/terms"
                className="text-sm text-cocoa-taupe hover:text-burnt-peach transition-colors duration-200 text-center md:text-left"
              >
                Termos e Condições
              </Link>
            </div>
          </div>

          {/* Suporte */}
          <div className="space-y-3 text-center md:text-left">
            <h4 className="text-sm font-medium text-deep-mocha">
              Suporte
            </h4>
            <div className="flex items-center space-x-2 justify-center md:justify-start">
              <Mail className="h-4 w-4 text-cocoa-taupe" />
              <a 
                href="mailto:suporte@resideai.pt"
                className="text-sm text-cocoa-taupe hover:text-burnt-peach transition-colors duration-200"
              >
                suporte@resideai.pt
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-4 border-t border-cocoa-taupe/10">
          <p className="text-center text-sm text-warm-taupe">
            © 2025 ResideAI. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
