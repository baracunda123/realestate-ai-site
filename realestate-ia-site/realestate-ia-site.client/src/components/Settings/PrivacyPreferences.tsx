import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Shield, Lock, Database, Cookie } from 'lucide-react';

export function PrivacyPreferences() {
  return (
    <Card className="border border-border bg-card shadow-strong">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-accent" />
          <span className="text-foreground">Privacidade e Dados</span>
        </CardTitle>
        <CardDescription>
          Como os teus dados são usados e partilhados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* What we collect */}
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Database className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-foreground mb-1">Dados que recolhemos</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Informações de conta (email, nome, telefone)</li>
                <li>• Histórico de pesquisas e favoritos</li>
                <li>• Dados de utilização anónimos para melhorar o serviço</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Cookies */}
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Cookie className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-foreground mb-1">Cookies</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Essenciais:</strong> Autenticação e funcionamento básico</li>
                <li>• <strong>Análise:</strong> Ferramentas para entender como usas o site</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Lock className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="text-foreground mb-1">
                Os teus dados estão seguros
              </p>
              <p className="text-muted-foreground text-xs">
                Utilizamos cookies essenciais para o funcionamento do site e ferramentas de análise 
                para melhorar a tua experiência. Nunca partilhamos os teus dados pessoais com terceiros.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}