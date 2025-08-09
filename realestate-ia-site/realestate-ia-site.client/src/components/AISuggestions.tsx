import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sparkles, TrendingUp, MapPin, DollarSign, Brain, Target } from 'lucide-react';
import { PremiumFeaturesBanner } from './PremiumFeaturesBanner';

interface AISuggestionsProps {
  searchQuery: string;
  user?: any;
}

export function AISuggestions({ searchQuery, user }: AISuggestionsProps) {
  const suggestions = [
    {
      title: 'Combinação Perfeita',
      description: 'Baseado nas suas preferências, encontramos 3 propriedades com vista da cidade e comodidades modernas.',
      action: 'Ver Combinações',
      type: 'match',
      icon: Target,
      badgeColor: 'bg-gray-100 text-gray-700',
      buttonColor: 'bg-gray-700 hover:bg-gray-800',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
    {
      title: 'Alerta de Preço',
      description: 'Uma propriedade que você visualizou semana passada reduziu o preço em R$ 275.000.',
      action: 'Ver Propriedade',
      type: 'alert',
      icon: TrendingUp,
      badgeColor: 'bg-gray-100 text-gray-700',
      buttonColor: 'bg-gray-700 hover:bg-gray-800',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
    {
      title: 'Insight do Bairro',
      description: 'Propriedades na Vila Madalena estão vendendo 15% mais rápido que a média. Considere visualizar em breve.',
      action: 'Saber Mais',
      type: 'insight',
      icon: MapPin,
      badgeColor: 'bg-gray-100 text-gray-700',
      buttonColor: 'bg-gray-700 hover:bg-gray-800',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600'
    },
    {
      title: 'Otimizador de Orçamento',
      description: 'Você pode ter 20m² a mais expandindo sua busca em 3km de raio.',
      action: 'Ajustar Busca',
      type: 'optimization',
      icon: DollarSign,
      badgeColor: 'bg-gray-100 text-gray-700',
      buttonColor: 'bg-gray-700 hover:bg-gray-800',
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600'
    }
  ];

  const getRandomSuggestions = () => {
    return suggestions.sort(() => Math.random() - 0.5).slice(0, 2);
  };

  const activeSuggestions = getRandomSuggestions();

  return (
    <div className="space-y-4">
      {/* Premium Banner */}
      <PremiumFeaturesBanner user={user} />

      {/* AI Suggestions */}
      <Card className="border border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Brain className="h-4 w-4 text-slate-600" />
            </div>
            <span className="text-slate-800">Insights de IA</span>
            <Badge className="bg-slate-100 text-slate-600 border-0 text-xs">
              <Sparkles className="h-2 w-2 mr-1" />
              LIVE
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeSuggestions.map((suggestion, index) => {
            const IconComponent = suggestion.icon;
            return (
              <div key={index} className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 ${suggestion.iconBg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border border-gray-200 shadow-sm`}>
                    <IconComponent className={`h-5 w-5 ${suggestion.iconColor}`} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-sm text-slate-800">{suggestion.title}</span>
                        <Badge className={`text-xs ${suggestion.badgeColor} border-0`}>
                          <Sparkles className="h-2 w-2 mr-1" />
                          IA
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {suggestion.description}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      className={`h-8 text-xs ${suggestion.buttonColor} text-white border-0 shadow-sm`}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {suggestion.action}
                    </Button>
                  </div>
                </div>
                {index < activeSuggestions.length - 1 && (
                  <hr className="border-slate-200" />
                )}
              </div>
            );
          })}

          {searchQuery && (
            <div className="pt-3 border-t border-slate-200">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm font-semibold">
                  <div className="w-6 h-6 bg-slate-100 rounded-md flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-slate-600" />
                  </div>
                  <span className="text-slate-800">Análise de Busca IA</span>
                </div>
                <p className="text-xs text-slate-600">
                  Com base em "{searchQuery}", recomendo propriedades com comodidades modernas em bairros urbanos.
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge className="text-xs bg-slate-100 text-slate-700 border-0">
                    Cozinha Moderna
                  </Badge>
                  <Badge className="text-xs bg-gray-100 text-gray-700 border-0">
                    Vista da Cidade
                  </Badge>
                  <Badge className="text-xs bg-gray-200 text-gray-700 border-0">
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