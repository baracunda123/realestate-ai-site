import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Sparkles, 
  Bell, 
  Search, 
  Heart, 
  TrendingUp,
  Crown
} from 'lucide-react';

interface PremiumFeaturesBannerProps {
  user: any;
  onUpgrade?: () => void;
}

export function PremiumFeaturesBanner({ user, onUpgrade }: PremiumFeaturesBannerProps) {
  if (user?.isPremium) {
    return (
      <Card className="border border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-amber-800">HomeFinder Premium</span>
                <Badge className="bg-amber-500 text-white border-0 text-xs">
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
      <Card className="border border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50 shadow-sm">
        <CardContent className="p-4">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-slate-600 rounded-xl flex items-center justify-center mx-auto">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Crie sua conta gratuita</h3>
              <p className="text-sm text-slate-600">
                Salve favoritos, receba alertas e use busca AI avançada
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 shadow-sm">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-slate-800">Upgrade Premium</span>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
            Oferta Limitada
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-blue-50 rounded-md flex items-center justify-center">
              <Search className="h-3 w-3 text-blue-600" />
            </div>
            <span className="text-slate-700">Busca AI Avançada</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-red-50 rounded-md flex items-center justify-center">
              <Heart className="h-3 w-3 text-red-600" />
            </div>
            <span className="text-slate-700">Favoritos Ilimitados</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-amber-50 rounded-md flex items-center justify-center">
              <Bell className="h-3 w-3 text-amber-600" />
            </div>
            <span className="text-slate-700">Alertas Personalizados</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-purple-50 rounded-md flex items-center justify-center">
              <TrendingUp className="h-3 w-3 text-purple-600" />
            </div>
            <span className="text-slate-700">Insights de Mercado</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div>
            <div className="text-sm font-semibold text-slate-800">
              R$ 19,90<span className="text-xs font-normal">/mês</span>
            </div>
            <div className="text-xs text-slate-600">7 dias grátis</div>
          </div>
          <Button 
            size="sm" 
            onClick={onUpgrade}
            className="bg-slate-700 hover:bg-slate-800 text-white border-0 shadow-sm"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Começar Grátis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}