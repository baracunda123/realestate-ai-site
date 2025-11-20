import { Home, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full bg-card border-t border-border mt-auto shadow-strong">
      <div className="site-container py-6">
        {/* Single Row Layout */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo e Copyright */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center shadow-blue">
              <Home className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">ResideAI</h3>
              <p className="text-xs text-muted-foreground"> 2025 Todos os direitos reservados</p>
            </div>
          </div>

          {/* Links e Suporte - Inline */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm">
            <Link 
              to="/privacy"
              className="text-muted-foreground hover:text-accent transition-colors duration-200"
            >
              Privacidade
            </Link>
            <Link 
              to="/terms"
              className="text-muted-foreground hover:text-accent transition-colors duration-200"
            >
              Termos
            </Link>
            <a 
              href="mailto:suporte@resideai.pt"
              className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors duration-200 group"
            >
              <Mail className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
              <span>Suporte</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}