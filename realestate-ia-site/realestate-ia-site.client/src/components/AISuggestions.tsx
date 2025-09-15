import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sparkles, TrendingUp, MapPin, DollarSign, Brain, Target } from 'lucide-react';


import type { User } from '../types/PersonalArea';

interface AISuggestionsProps {
  searchQuery: string;
  user?: User | null;
}

export function AISuggestions({ searchQuery, user }: AISuggestionsProps) {
  const suggestions = [
    {
      title: 'Combinação Perfeita',
      description: 'Baseado nas suas preferências, encontrámos 3 propriedades com vista da cidade e comodidades modernas.',
      action: 'Ver Combinações',
      type: 'match',
      icon: Target,
      badgeColor: 'bg-burnt-peach-light text-deep-mocha',
      buttonColor: 'bg-burnt-peach hover:bg-burnt-peach-light text-deep-mocha font-semibold',
      iconBg: 'bg-burnt-peach-lighter',
      iconColor: 'text-burnt-peach-dark'
    },
    {
      title: 'Alerta de Preço',
      description: 'Uma propriedade que visualizou na semana passada reduziu o preço em R$ 275.000.',
      action: 'Ver Propriedade',
      type: 'alert',
      icon: TrendingUp,
      badgeColor: 'bg-cocoa-taupe-light text-deep-mocha',
      buttonColor: 'bg-cocoa-taupe hover:bg-cocoa-taupe-light text-pure-white font-semibold',
      iconBg: 'bg-cocoa-taupe-lighter',
      iconColor: 'text-cocoa-taupe-dark'
    },
    {
      title: 'Insight do Bairro',
      description: 'Propriedades na Vila Madalena estão vendendo 15% mais rápido que a média. Considere visualizar em breve.',
      action: 'Saber Mais',
      type: 'insight',
      icon: MapPin,
      badgeColor: 'bg-warm-taupe-light text-deep-mocha',
      buttonColor: 'bg-warm-taupe hover:bg-warm-taupe-dark text-pure-white font-semibold',
      iconBg: 'bg-warm-taupe-lighter',
      iconColor: 'text-warm-taupe-dark'
    },
    {
      title: 'Otimizador de Orçamento',
      description: 'Pode ter 20m² a mais expandindo a sua procura em 3km de raio.',
      action: 'Ajustar Procura',
      type: 'optimization',
      icon: DollarSign,
      badgeColor: 'bg-pale-clay-deep text-deep-mocha',
      buttonColor: 'bg-cocoa-taupe hover:bg-cocoa-taupe-light text-pure-white font-semibold',
      iconBg: 'bg-pale-clay-light',
      iconColor: 'text-cocoa-taupe-dark'
    }
  ];

  const getRandomSuggestions = () => {
    return suggestions.sort(() => Math.random() - 0.5).slice(0, 2);
  };

  const activeSuggestions = getRandomSuggestions();

  return (
    <div className="space-y-4">
      {/* AI Suggestions */}
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-burnt-peach rounded-lg flex items-center justify-center shadow-burnt-peach">
              <Brain className="h-4 w-4 text-pure-white" />
            </div>
            <span className="text-deep-mocha font-semibold">Insights de IA</span>
            <Badge className="bg-burnt-peach text-pure-white border-0 text-xs shadow-clay-whisper">
              <Sparkles className="h-2 w-2 mr-1" />
              LIVE
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeSuggestions.map((suggestion, index) => {
            const IconComponent = suggestion.icon;
            return (
              <div key={`suggestion-${suggestion.title}-${index}`} className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 ${suggestion.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border border-pale-clay-deep shadow-clay-whisper`}>
                    <IconComponent className={`h-5 w-5 ${suggestion.iconColor}`} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-sm text-deep-mocha">{suggestion.title}</span>
                        <Badge className={`text-xs ${suggestion.badgeColor} border-0 shadow-clay-whisper`}>
                          <Sparkles className="h-2 w-2 mr-1" />
                          IA
                        </Badge>
                      </div>
                      <p className="text-xs text-warm-taupe leading-relaxed">
                        {suggestion.description}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      className={`h-8 text-xs ${suggestion.buttonColor} border-0 shadow-clay-whisper transition-all duration-200`}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {suggestion.action}
                    </Button>
                  </div>
                </div>
                {index < activeSuggestions.length - 1 && (
                  <hr className="border-pale-clay-deep" />
                )}
              </div>
            );
          })}

          {searchQuery && (
            <div className="pt-3 border-t border-pale-clay-deep">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm font-semibold">
                  <div className="w-6 h-6 bg-burnt-peach-lighter rounded-md flex items-center justify-center shadow-clay-whisper border border-pale-clay-deep">
                    <Sparkles className="h-3 w-3 text-burnt-peach-dark" />
                  </div>
                  <span className="text-deep-mocha">Análise de Busca IA</span>
                </div>
                <p className="text-xs text-warm-taupe">
                  Com base em "{searchQuery}", recomendo propriedades com comodidades modernas em bairros urbanos.
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge className="text-xs bg-pale-clay-light text-burnt-peach-dark border border-pale-clay-deep">
                    Cozinha Moderna
                  </Badge>
                  <Badge className="text-xs bg-pale-clay-light text-cocoa-taupe-dark border border-pale-clay-deep">
                    Vista da Cidade
                  </Badge>
                  <Badge className="text-xs bg-pale-clay-light text-warm-taupe-dark border border-pale-clay-deep">
                    Acesso ao Transporte
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}