import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Check, Crown, Star, Zap } from 'lucide-react';

interface PersonalAreaPlansProps {
  onUpgrade: () => void;
  userIsPremium?: boolean;
}

export function PersonalAreaPlans({ onUpgrade, userIsPremium = false }: PersonalAreaPlansProps) {
  const freePlanFeatures = [
    'Até 3 propriedades favoritas',
    'Busca básica por filtros',
    'Visualização de propriedades',
    'Suporte por email'
  ];

  const premiumPlanFeatures = [
    'Favoritos ilimitados',
    'Busca avançada com IA',
    'Alertas personalizados',
    'Tour virtual 360°',
    'Histórico completo',
    'Comparação de propriedades',
    'Insights de mercado',
    'Suporte prioritário',
    'Relatórios detalhados'
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Escolha seu Plano</h2>
        <p className="text-muted-foreground">
          Encontre o plano perfeito para suas necessidades imobiliárias
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plano Free */}
        <Card className={`border-2 ${userIsPremium ? 'border-pale-clay-deep' : 'border-burnt-peach bg-burnt-peach-lighter/5'} relative`}>
          {!userIsPremium && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-burnt-peach text-pure-white border-0">
                Plano Atual
              </Badge>
            </div>
          )}
          
          <CardHeader className="text-center space-y-4">
            <div className="w-12 h-12 bg-pale-clay-light rounded-lg mx-auto flex items-center justify-center">
              <Star className="h-6 w-6 text-cocoa-taupe" />
            </div>
            <div>
              <CardTitle className="text-xl text-foreground">Free</CardTitle>
              <p className="text-muted-foreground text-sm">Para começar a explorar</p>
            </div>
            <div className="space-y-1">
              <span className="text-3xl font-bold text-foreground">Grátis</span>
              <p className="text-sm text-muted-foreground">Para sempre</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              {freePlanFeatures.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Check className="h-4 w-4 text-success-gentle flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
            
            <Button 
              variant="outline" 
              className="w-full border-pale-clay-deep hover:bg-pale-clay-light"
              disabled={!userIsPremium}
            >
              {userIsPremium ? 'Downgrade para Free' : 'Plano Atual'}
            </Button>
          </CardContent>
        </Card>

        {/* Plano Premium */}
        <Card className={`border-2 ${userIsPremium ? 'border-burnt-peach bg-burnt-peach-lighter/5' : 'border-pale-clay-deep'} relative`}>
          {userIsPremium && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-burnt-peach text-pure-white border-0">
                <Crown className="h-3 w-3 mr-1" />
                Plano Atual
              </Badge>
            </div>
          )}
          
          <CardHeader className="text-center space-y-4">
            <div className="w-12 h-12 bg-burnt-peach-lighter rounded-lg mx-auto flex items-center justify-center">
              <Crown className="h-6 w-6 text-burnt-peach-dark" />
            </div>
            <div>
              <CardTitle className="text-xl text-foreground flex items-center justify-center space-x-2">
                <span>Premium</span>
                <Zap className="h-4 w-4 text-burnt-peach" />
              </CardTitle>
              <p className="text-muted-foreground text-sm">Funcionalidades completas</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-baseline justify-center space-x-1">
                <span className="text-sm text-muted-foreground line-through">R$ 49,90</span>
                <span className="text-3xl font-bold text-foreground">R$ 29,90</span>
              </div>
              <p className="text-sm text-muted-foreground">por mês</p>
              <Badge variant="secondary" className="bg-success-soft text-success-strong border-0">
                40% OFF
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              {premiumPlanFeatures.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Check className="h-4 w-4 text-success-gentle flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{feature}</span>
                </div>
              ))}
            </div>
            
            <Button 
              onClick={onUpgrade}
              className="w-full bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white shadow-clay-medium"
              disabled={userIsPremium}
            >
              {userIsPremium ? (
                <div className="flex items-center space-x-2">
                  <Crown className="h-4 w-4" />
                  <span>Plano Ativo</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Crown className="h-4 w-4" />
                  <span>Upgrade para Premium</span>
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Garantia */}
      <Card className="bg-pale-clay-light border-pale-clay-deep">
        <CardContent className="p-6 text-center">
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">Garantia de 7 dias</h3>
            <p className="text-sm text-muted-foreground">
              Não ficou satisfeito? Cancele em até 7 dias e receba 100% do seu dinheiro de volta.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}