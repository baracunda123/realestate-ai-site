import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sparkles, TrendingUp, MapPin, DollarSign, Zap, Brain, Target } from 'lucide-react';
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
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700'
    },
    {
      title: 'Alerta de Preço',
      description: 'Uma propriedade que você visualizou semana passada reduziu o preço em R$ 275.000.',
      action: 'Ver Propriedade',
      type: 'alert',
      icon: TrendingUp,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    {
      title: 'Insight do Bairro',
      description: 'Propriedades na Vila Madalena estão vendendo 15% mais rápido que a média. Considere visualizar em breve.',
      action: 'Saber Mais',
      type: 'insight',
      icon: MapPin,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Otimizador de Orçamento',
      description: 'Você pode ter 20m² a mais expandindo sua busca em 3km de raio.',
      action: 'Ajustar Busca',
      type: 'optimization',
      icon: DollarSign,
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
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
      <Card className="border-2 border-primary/10 bg-gradient-to-br from-white to-primary/5 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-purple-600 rounded-lg flex items-center justify-center">
              <Brain className="h-4 w-4 text-white" />
            </div>
            <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Insights de IA
            </span>
            <div className="flex items-center space-x-1">
              <Zap className="h-3 w-3 text-yellow-500" />
              <span className="text-xs text-yellow-600 font-medium">LIVE</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeSuggestions.map((suggestion, index) => {
            const IconComponent = suggestion.icon;
            return (
              <div key={index} className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 ${suggestion.bgColor} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border border-white shadow-sm`}>
                    <IconComponent className={`h-5 w-5 ${suggestion.textColor}`} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="font-semibold text-sm text-gray-900">{suggestion.title}</span>
                        <Badge className={`text-xs bg-gradient-to-r ${suggestion.color} text-white border-0 shadow-sm`}>
                          <Sparkles className="h-2 w-2 mr-1" />
                          IA
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {suggestion.description}
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      className={`h-8 text-xs bg-gradient-to-r ${suggestion.color} text-white border-0 hover:shadow-md transition-all duration-200`}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      {suggestion.action}
                    </Button>
                  </div>
                </div>
                {index < activeSuggestions.length - 1 && (
                  <hr className="border-gray-200" />
                )}
              </div>
            );
          })}

          {searchQuery && (
            <div className="pt-3 border-t border-gray-200">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm font-semibold">
                  <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-md flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-gray-900">Análise de Busca IA</span>
                </div>
                <p className="text-xs text-gray-600">
                  Com base em "{searchQuery}", recomendo propriedades com comodidades modernas em bairros urbanos.
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge className="text-xs bg-gradient-to-r from-indigo-500 to-blue-500 text-white border-0">
                    Cozinha Moderna
                  </Badge>
                  <Badge className="text-xs bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0">
                    Vista da Cidade
                  </Badge>
                  <Badge className="text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
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