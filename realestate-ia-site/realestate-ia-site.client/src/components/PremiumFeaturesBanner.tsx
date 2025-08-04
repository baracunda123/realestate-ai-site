import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Sparkles, 
  Zap, 
  Bell, 
  Search, 
  Heart, 
  TrendingUp,
  Star,
  Crown
} from 'lucide-react';

interface PremiumFeaturesBannerProps {
  user: any;
  onUpgrade?: () => void;
}

export function PremiumFeaturesBanner({ user, onUpgrade }: PremiumFeaturesBannerProps) {
  if (user?.isPremium) {
    return (
      <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-amber-800">HomeFinder Premium</span>
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs">
                  <Sparkles className="h-2 w-2 mr-1" />
                  Ativo
                </Badge>
              </div>
              <p className="text-sm text-amber-700">
                Você tem acesso a todos os recursos premium! 🎉
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple/5 shadow-lg">
        <CardContent className="p-4">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-gradient-to-r from-primary to-purple-600 rounded-xl flex items-center justify-center mx-auto">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Crie sua conta gratuita</h3>
              <p className="text-sm text-gray-600">
                Salve favoritos, receba alertas e use busca AI avançada
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-amber-800">Upgrade Premium</span>
          </div>
          <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 text-xs">
            <Zap className="h-2 w-2 mr-1" />
            Oferta Limitada
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-blue-100 rounded-md flex items-center justify-center">
              <Search className="h-3 w-3 text-blue-600" />
            </div>
            <span className="text-gray-700">Busca AI Avançada</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-red-100 rounded-md flex items-center justify-center">
              <Heart className="h-3 w-3 text-red-600" />
            </div>
            <span className="text-gray-700">Favoritos Ilimitados</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-amber-100 rounded-md flex items-center justify-center">
              <Bell className="h-3 w-3 text-amber-600" />
            </div>
            <span className="text-gray-700">Alertas Personalizados</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-purple-100 rounded-md flex items-center justify-center">
              <TrendingUp className="h-3 w-3 text-purple-600" />
            </div>
            <span className="text-gray-700">Insights de Mercado</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-amber-200">
          <div>
            <div className="text-sm font-semibold text-amber-800">
              R$ 19,90<span className="text-xs font-normal">/mês</span>
            </div>
            <div className="text-xs text-amber-600">7 dias grátis</div>
          </div>
          <Button 
            size="sm" 
            onClick={onUpgrade}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:shadow-md transition-all duration-200"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Começar Grátis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}