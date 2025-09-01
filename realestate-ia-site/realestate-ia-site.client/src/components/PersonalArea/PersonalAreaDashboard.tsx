import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Heart, 
  Search, 
  Bell, 
  Activity, 
  Target, 
  Crown, 
  TrendingUp, 
  ArrowRight,
  BarChart3,
  MapPin
} from 'lucide-react';
import { type User } from '../../types/PersonalArea';
import { getCurrentLimits, getUsagePercentage } from '../../utils/PersonalArea';

interface PersonalAreaDashboardProps {
  user: User;
  favoritesCount: number;
  savedSearchesCount: number;
  alertsCount: number;
  onCardClick: (tabName: string) => void;
  onOpenUpgradeModal?: () => void;
}

export function PersonalAreaDashboard({ 
  user, 
  favoritesCount, 
  savedSearchesCount, 
  alertsCount,
  onCardClick,
  onOpenUpgradeModal 
}: PersonalAreaDashboardProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const currentLimits = getCurrentLimits(user);

  return (
    <div className="space-y-6">
      {/* Plan Usage Overview for Free Users ONLY */}
      {!user.isPremium && (
        <Card className="border border-burnt-peach-light bg-burnt-peach-lighter/10 shadow-clay-soft">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-medium text-foreground mb-1">Uso do Plano Free</h3>
                <p className="text-sm text-muted-foreground">
                  Acompanhe a utilização dos seus recursos gratuitos
                </p>
              </div>
              <Button 
                size="sm" 
                className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white"
                onClick={onOpenUpgradeModal}
              >
                <Crown className="h-3 w-3 mr-1" />
                Upgrade
              </Button>
            </div>
            
            {/* Usage bars for Free users */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Favoritos</span>
                  <span>{favoritesCount}/{currentLimits.maxFavorites}</span>
                </div>
                <Progress 
                  value={getUsagePercentage(favoritesCount, currentLimits.maxFavorites)} 
                  className="h-2"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Pesquisas Guardadas</span>
                  <span>{savedSearchesCount}/{currentLimits.maxSavedSearches}</span>
                </div>
                <Progress 
                  value={getUsagePercentage(savedSearchesCount, currentLimits.maxSavedSearches)} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Favorites Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onHoverStart={() => setHoveredCard('favorites')}
          onHoverEnd={() => setHoveredCard(null)}
        >
          <Card 
            className="border border-pale-clay-deep bg-pure-white shadow-clay-deep cursor-pointer transition-all duration-200 hover:shadow-clay-medium"
            onClick={() => onCardClick('favorites')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Propriedades Favoritas</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {favoritesCount}
                    {!user.isPremium && (
                      <span className="text-sm text-muted-foreground ml-1">
                        / {currentLimits.maxFavorites}
                      </span>
                    )}
                  </p>
                </div>
                <div className="relative">
                  <div className="w-12 h-12 bg-pale-clay-light rounded-lg flex items-center justify-center border border-pale-clay-deep">
                    <Heart className="h-6 w-6 text-cocoa-taupe" />
                  </div>
                  {hoveredCard === 'favorites' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -top-2 -right-4"
                    >
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </motion.div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Saved Searches Card */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onHoverStart={() => setHoveredCard('searches')}
          onHoverEnd={() => setHoveredCard(null)}
        >
          <Card 
            className="border border-pale-clay-deep bg-pure-white shadow-clay-deep cursor-pointer transition-all duration-200 hover:shadow-clay-medium"
            onClick={() => onCardClick('searches')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pesquisas Guardadas</p>
                  <p className="text-2xl font-semibold text-foreground">
                    {savedSearchesCount}
                    {!user.isPremium && (
                      <span className="text-sm text-muted-foreground ml-1">
                        / {currentLimits.maxSavedSearches}
                      </span>
                    )}
                  </p>
                </div>
                <div className="relative">
                  <div className="w-12 h-12 bg-pale-clay-light rounded-lg flex items-center justify-center border border-pale-clay-deep">
                    <Search className="h-6 w-6 text-cocoa-taupe" />
                  </div>
                  {hoveredCard === 'searches' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -top-2 -right-4"
                    >
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </motion.div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alerts Card - Only for Premium users */}
        {user.isPremium && (
          <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onHoverStart={() => setHoveredCard('alerts')}
            onHoverEnd={() => setHoveredCard(null)}
          >
            <Card 
              className="border border-pale-clay-deep bg-pure-white shadow-clay-deep cursor-pointer transition-all duration-200 hover:shadow-clay-medium"
              onClick={() => onCardClick('alerts')}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Alertas Ativos</p>
                    <p className="text-2xl font-semibold text-foreground">
                      {alertsCount}
                    </p>
                  </div>
                  <div className="relative">
                    <div className="w-12 h-12 bg-burnt-peach-lighter rounded-lg flex items-center justify-center border border-pale-clay-deep">
                      <Bell className="h-6 w-6 text-burnt-peach-dark" />
                    </div>
                    {hoveredCard === 'alerts' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute -top-2 -right-4"
                      >
                        <ArrowRight className="h-4 w-4 text-primary" />
                      </motion.div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Recent Activity & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-burnt-peach-dark" />
              <span className="text-deep-mocha">Atividade Recente</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 p-3 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
              <div className="w-8 h-8 bg-burnt-peach-lighter rounded-full flex items-center justify-center border border-pale-clay-deep">
                <Heart className="h-4 w-4 text-burnt-peach-dark" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-deep-mocha">Propriedade favoritada</p>
                <p className="text-xs text-warm-taupe">Loft Moderno no Centro - hoje</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
              <div className="w-8 h-8 bg-burnt-peach-lighter rounded-full flex items-center justify-center border border-pale-clay-deep">
                <Bell className="h-4 w-4 text-burnt-peach-dark" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-deep-mocha">Alerta ativado</p>
                <p className="text-xs text-warm-taupe">2 novas propriedades no Centro até R$ 4M</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
              <div className="w-8 h-8 bg-burnt-peach-lighter rounded-full flex items-center justify-center border border-pale-clay-deep">
                <Search className="h-4 w-4 text-burnt-peach-dark" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-deep-mocha">Nova pesquisa guardada</p>
                <p className="text-xs text-warm-taupe">Apartamentos Vila Madalena - 2 dias atrás</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Insights - Premium Feature */}
        {user.isPremium ? (
          <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-burnt-peach-dark" />
                <span className="text-deep-mocha">Insights Personalizados</span>
                <Badge className="bg-burnt-peach text-pure-white border-0 text-xs">
                  <Crown className="h-2 w-2 mr-1" />
                  Premium
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
                  <TrendingUp className="h-5 w-5 text-burnt-peach" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-deep-mocha">Tendência de Mercado</p>
                    <p className="text-xs text-warm-taupe">Preços em Pinheiros aumentaram 8% este mês</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
                  <BarChart3 className="h-5 w-5 text-cocoa-taupe" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-deep-mocha">Oportunidade</p>
                    <p className="text-xs text-warm-taupe">3 propriedades similares com preço abaixo da média</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-3 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
                  <MapPin className="h-5 w-5 text-warm-taupe" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-deep-mocha">Área Recomendada</p>
                    <p className="text-xs text-warm-taupe">Brooklin tem potencial de valorização de 12%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Upgrade Prompt for Free Users */
          <Card className="border border-burnt-peach-light bg-burnt-peach-lighter/10 shadow-clay-soft">
            <CardContent className="p-6 text-center">
              <Crown className="h-12 w-12 text-burnt-peach mx-auto mb-4" />
              <h3 className="font-medium text-foreground mb-2">Insights Premium</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Aceda a análises personalizadas de mercado, tendências e oportunidades de investimento
              </p>
              <Button 
                className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white"
                onClick={onOpenUpgradeModal}
              >
                <Crown className="h-4 w-4 mr-2" />
                Fazer Upgrade
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}