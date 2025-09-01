import React from 'react';
import { motion } from 'motion/react';
import { 
  Heart, 
  Search, 
  Bell, 
  Clock, 
  Crown, 
  Plus,
  Bookmark,
  AlertCircle,
  Eye,
  Target,
  type LucideIcon,
  Zap,
  Shield,
  Star,
  X,
  Smartphone,
  BarChart3,
  Users,
  Infinity
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isPremiumFeature?: boolean;
}

interface OldEmptyStateProps {
  type: 'favorites' | 'searches' | 'alerts' | 'history';
  isPremium: boolean;
  onAction?: () => void;
  onUpgrade?: () => void;
}

const emptyStateConfig = {
  favorites: {
    icon: Heart,
    title: 'Nenhuma propriedade favoritada',
    description: 'Comece a favoritar propriedades que chamem sua atenção para encontrá-las facilmente depois.',
    actionText: 'Explorar Propriedades',
    iconColor: 'text-burnt-peach',
    iconBg: 'bg-burnt-peach-lighter',
    freeLimit: 3,
    premiumFeature: false
  },
  searches: {
    icon: Search,
    title: 'Nenhuma pesquisa salva',
    description: 'Salve suas pesquisas favoritas para receber notificações sobre novas propriedades que correspondam aos seus critérios.',
    actionText: 'Fazer Nova Pesquisa',
    iconColor: 'text-cocoa-taupe',
    iconBg: 'bg-cocoa-taupe-lighter',
    freeLimit: 1,
    premiumFeature: false
  },
  alerts: {
    icon: Bell,
    title: 'Nenhum alerta configurado',
    description: 'Configure alertas personalizados para ser notificado sobre propriedades que atendam exatamente aos seus critérios.',
    actionText: 'Criar Primeiro Alerta',
    iconColor: 'text-burnt-peach-dark',
    iconBg: 'bg-burnt-peach-lighter',
    freeLimit: 1,
    premiumFeature: true
  },
  history: {
    icon: Clock,
    title: 'Histórico vazio',
    description: 'Suas propriedades visualizadas aparecerão aqui, facilitando o acompanhamento dos seus interesses.',
    actionText: 'Explorar Propriedades',
    iconColor: 'text-warm-taupe',
    iconBg: 'bg-pale-clay-light',
    freeLimit: null,
    premiumFeature: false
  }
};

// New EmptyState component with simpler interface
export function EmptyState({ icon: IconComponent, title, description, actionLabel, onAction, isPremiumFeature }: EmptyStateProps) {
  // Show premium lock for premium features when needed
  if (isPremiumFeature) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-soft">
          <CardContent className="p-12">
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="flex justify-center"
              >
                <div className="w-20 h-20 bg-pale-clay-light rounded-full flex items-center justify-center border-2 border-pale-clay-deep">
                  <Crown className="h-10 w-10 text-cocoa-taupe" />
                </div>
              </motion.div>
              
              <div className="space-y-3">
                <h3 className="text-xl font-medium text-deep-mocha">
                  {title}
                </h3>
                <p className="text-warm-taupe max-w-md mx-auto leading-relaxed">
                  {description}
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                {onAction && (
                  <Button 
                    onClick={onAction}
                    className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white border-0 shadow-clay-soft"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    {actionLabel || 'Upgrade para Premium'}
                  </Button>
                )}
              </motion.div>

              <div className="pt-4 border-t border-pale-clay-medium">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center space-x-1">
                      <Eye className="h-4 w-4 text-warm-taupe" />
                      <span className="text-sm font-medium text-deep-mocha">Free</span>
                    </div>
                    <p className="text-xs text-warm-taupe">Acesso limitado</p>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center space-x-1">
                      <Crown className="h-4 w-4 text-burnt-peach" />
                      <span className="text-sm font-medium text-deep-mocha">Premium</span>
                    </div>
                    <p className="text-xs text-warm-taupe">Recursos ilimitados</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-soft">
        <CardContent className="p-12">
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="flex justify-center"
            >
              <div className="w-20 h-20 bg-pale-clay-light rounded-full flex items-center justify-center border-2 border-pale-clay-deep">
                <IconComponent className="h-10 w-10 text-cocoa-taupe" />
              </div>
            </motion.div>
            
            <div className="space-y-3">
              <h3 className="text-xl font-medium text-deep-mocha">
                {title}
              </h3>
              <p className="text-warm-taupe max-w-md mx-auto leading-relaxed">
                {description}
              </p>
            </div>

            {onAction && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <Button 
                  onClick={onAction}
                  className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white border-0 shadow-clay-soft"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {actionLabel || 'Ação'}
                </Button>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Legacy EmptyState component for backwards compatibility
export function LegacyEmptyState({ type, isPremium, onAction, onUpgrade }: OldEmptyStateProps) {
  const config = emptyStateConfig[type];
  const IconComponent = config.icon;

  // Show premium lock for non-premium users trying to access premium features
  if (!isPremium && config.premiumFeature) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-soft">
          <CardContent className="p-12">
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
                className="flex justify-center"
              >
                <div className="w-20 h-20 bg-pale-clay-light rounded-full flex items-center justify-center border-2 border-pale-clay-deep">
                  <Crown className="h-10 w-10 text-cocoa-taupe" />
                </div>
              </motion.div>
              
              <div className="space-y-3">
                <h3 className="text-xl font-medium text-deep-mocha">
                  Recurso Premium
                </h3>
                <p className="text-warm-taupe max-w-md mx-auto leading-relaxed">
                  {config.description} Este recurso está disponível apenas para usuários Premium.
                </p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <Button 
                  onClick={onUpgrade}
                  className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white border-0 shadow-clay-soft"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade para Premium
                </Button>
              </motion.div>

              <div className="pt-4 border-t border-pale-clay-medium">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center space-x-1">
                      <Eye className="h-4 w-4 text-warm-taupe" />
                      <span className="text-sm font-medium text-deep-mocha">Free</span>
                    </div>
                    <p className="text-xs text-warm-taupe">Acesso limitado</p>
                  </div>
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center space-x-1">
                      <Crown className="h-4 w-4 text-burnt-peach" />
                      <span className="text-sm font-medium text-deep-mocha">Premium</span>
                    </div>
                    <p className="text-xs text-warm-taupe">Recursos ilimitados</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-soft">
        <CardContent className="p-12">
          <div className="text-center space-y-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="flex justify-center"
            >
              <div className={`w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center border-2 border-pale-clay-deep`}>
                <IconComponent className={`h-10 w-10 ${config.iconColor}`} />
              </div>
            </motion.div>
            
            <div className="space-y-3">
              <h3 className="text-xl font-medium text-deep-mocha">
                {config.title}
              </h3>
              <p className="text-warm-taupe max-w-md mx-auto leading-relaxed">
                {config.description}
              </p>
            </div>

            {onAction && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <Button 
                  onClick={onAction}
                  className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white border-0 shadow-clay-soft"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {config.actionText}
                </Button>
                
                {!isPremium && (
                  <Button 
                    variant="outline"
                    onClick={onUpgrade}
                    className="border-cocoa-taupe-light text-cocoa-taupe hover:bg-cocoa-taupe-lighter hover:text-cocoa-taupe-dark"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Upgrade Premium
                  </Button>
                )}
              </motion.div>
            )}

            {/* Limit info for free users */}
            {!isPremium && config.freeLimit && (
              <div className="pt-4 border-t border-pale-clay-medium">
                <div className="flex items-center justify-center space-x-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-warm-taupe" />
                  <span className="text-warm-taupe">
                    Plano Free: até {config.freeLimit} {type === 'favorites' ? 'favoritos' : type === 'searches' ? 'pesquisas salvas' : 'alertas'}
                  </span>
                </div>
                <p className="text-xs text-warm-taupe mt-1">
                  Upgrade para Premium e tenha acesso ilimitado
                </p>
              </div>
            )}

            {/* Special message for search history */}
            {type === 'history' && (
              <div className="pt-4 border-t border-pale-clay-medium">
                <div className="flex items-center justify-center space-x-2 text-sm">
                  <Target className="h-4 w-4 text-burnt-peach" />
                  <span className="text-warm-taupe">
                    Comece a explorar propriedades para ver seu histórico aqui
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Component specifically for Plans tab - always shows both plans
interface PlansEmptyStateProps {
  currentPlan: 'free' | 'premium';
  onUpgrade?: () => void;
}

export function PlansContent({ currentPlan, onUpgrade }: PlansEmptyStateProps) {
  const handleCancelPremium = () => {
    // Mock cancellation action
    console.log('Premium plan cancelled');
  };

  const plans = [
    {
      name: "Free",
      price: "Gratuito",
      description: "Acesso básico com limitações",
      icon: Shield,
      iconBg: "bg-pale-clay-light",
      iconColor: "text-cocoa-taupe",
      current: currentPlan === 'free',
      features: [
        { icon: Search, text: "Busca básica por propriedades" },
        { icon: Heart, text: "Até 3 propriedades favoritas" },
        { icon: Bookmark, text: "1 pesquisa salva por vez" },
        { icon: Eye, text: "Visualização de mapa básica" },
        { icon: Bell, text: "1 alerta de preço ativo" },
        { icon: Users, text: "Suporte por email" }
      ]
    },
    {
      name: "Premium",
      price: "R$ 29,90/mês",
      description: "Recursos avançados de IA",
      icon: Crown,
      iconBg: "bg-burnt-peach-lighter",
      iconColor: "text-burnt-peach-dark",
      current: currentPlan === 'premium',
      popular: true,
      features: [
        { icon: Zap, text: "Busca avançada com IA completa" },
        { icon: Infinity, text: "Propriedades favoritas ilimitadas" },
        { icon: Star, text: "Pesquisas salvas ilimitadas" },
        { icon: Bell, text: "Alertas de preço personalizados" },
        { icon: BarChart3, text: "Análises de mercado detalhadas" },
        { icon: Smartphone, text: "Tour virtual 3D premium" },
        { icon: Shield, text: "Suporte prioritário 24/7" },
        { icon: Target, text: "Relatórios de investimento" },
        { icon: Star, text: "Insights personalizados de IA" }
      ]
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      <div className="text-center space-y-3 mb-12">
        <h2 className="text-2xl font-semibold text-deep-mocha">
          Planos de Assinatura
        </h2>
        <p className="text-warm-taupe max-w-lg mx-auto">
          {currentPlan === 'premium' 
            ? 'Você está aproveitando todos os recursos Premium do HomeFinder AI.' 
            : 'Escolha o plano ideal para suas necessidades imobiliárias.'
          }
        </p>
      </div>

      {/* Layout de Planos Reorganizado */}
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Free Plan - Card Simples */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <Card className={`
            border-2 shadow-clay-medium transition-all duration-300 hover:shadow-clay-deep
            ${plans[0].current 
              ? 'border-burnt-peach bg-burnt-peach-lighter/20' 
              : 'border-pale-clay-deep bg-pure-white hover:border-pale-clay-darker'
            }
          `}>
            {plans[0].current && (
              <div className="absolute -top-3 right-6">
                <div className="bg-cocoa-taupe text-pure-white px-4 py-1 rounded-full text-sm font-medium shadow-clay-soft">
                  Plano Atual
                </div>
              </div>
            )}

            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Informações do Free Plan */}
                <div className="flex items-center space-x-6">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all duration-300
                      ${plans[0].current 
                        ? 'bg-burnt-peach-light border-burnt-peach text-pure-white shadow-burnt-peach' 
                        : `${plans[0].iconBg} border-pale-clay-deep ${plans[0].iconColor} hover:scale-105 hover:shadow-clay-soft`
                      }
                    `}>
                    <Shield className="h-10 w-10" />
                  </motion.div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-2xl font-semibold text-deep-mocha">
                        Plano Free
                      </h3>
                      <div className="text-3xl font-bold text-deep-mocha">
                        Gratuito
                      </div>
                    </div>
                    <p className="text-warm-taupe text-lg">
                      Acesso básico com limitações essenciais
                    </p>
                  </div>
                </div>

                {/* Features do Free em linha */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:max-w-lg">
                  {plans[0].features.slice(0, 6).map((feature, index) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <motion.div
                        key={index}
                        className="flex items-center space-x-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                      >
                        <div className="flex-shrink-0 w-4 h-4 rounded-full bg-pale-clay-deep flex items-center justify-center">
                          <FeatureIcon className="w-2.5 h-2.5 text-cocoa-taupe" />
                        </div>
                        <span className="text-xs text-warm-taupe">
                          {feature.text.split(' ').slice(0, 2).join(' ')}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Status do Free Plan */}
                {plans[0].current && (
                  <div className="text-center lg:text-right">
                    <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-cocoa-taupe-lighter border border-cocoa-taupe-light">
                      <div className="w-2 h-2 rounded-full bg-cocoa-taupe"></div>
                      <span className="text-sm font-medium text-cocoa-taupe-dark">
                        Plano Ativo
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Premium Plan - Card Destacado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="relative"
        >
          {/* Badge "Mais Popular" */}
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-burnt-peach text-pure-white px-6 py-2 rounded-full font-medium shadow-clay-medium">
              ⭐ Mais Popular
            </div>
          </div>

          <Card className={`
            border-2 shadow-clay-deep transition-all duration-300 hover:shadow-clay-strong
            ${plans[1].current 
              ? 'border-burnt-peach bg-burnt-peach-lighter/20 scale-[1.02]' 
              : 'border-burnt-peach-light bg-gradient-to-br from-pure-white to-burnt-peach-lighter/10 hover:border-burnt-peach hover:scale-[1.01]'
            }
          `}>
            {plans[1].current && (
              <div className="absolute -top-3 right-6">
                <div className="bg-burnt-peach text-pure-white px-4 py-1 rounded-full text-sm font-medium shadow-clay-soft">
                  Plano Atual
                </div>
              </div>
            )}

            <CardContent className="p-10">
              <div className="space-y-8">
                {/* Header do Premium */}
                <div className="text-center space-y-4">
                  <motion.div 
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-24 h-24 mx-auto rounded-full bg-burnt-peach border-2 border-burnt-peach-deep text-pure-white shadow-burnt-peach flex items-center justify-center transition-all duration-300 hover:shadow-clay-deep"
                  >
                    <Crown className="h-12 w-12" />
                  </motion.div>
                  
                  <div className="space-y-2">
                    <h3 className="text-3xl font-bold text-deep-mocha">
                      Plano Premium
                    </h3>
                    <p className="text-warm-taupe text-lg">
                      Recursos avançados de IA e acesso ilimitado
                    </p>
                    <div className="text-4xl font-bold text-burnt-peach">
                      R$ 29,90<span className="text-lg text-warm-taupe font-normal">/mês</span>
                    </div>
                  </div>
                </div>

                {/* Features em Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans[1].features.map((feature, index) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <motion.div
                        key={index}
                        className="flex items-start space-x-3 p-3 rounded-lg bg-burnt-peach-lighter/20 border border-burnt-peach-light/50"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.05 }}
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-burnt-peach flex items-center justify-center mt-0.5">
                          <FeatureIcon className="w-3.5 h-3.5 text-pure-white" />
                        </div>
                        <span className="text-sm text-deep-mocha font-medium leading-relaxed">
                          {feature.text}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* CTA ou Status */}
                <div className="text-center pt-4">
                  {!plans[1].current && onUpgrade ? (
                    <Button 
                      onClick={onUpgrade}
                      className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white border-0 shadow-clay-soft px-8 py-3 text-lg font-medium"
                    >
                      <Crown className="h-5 w-5 mr-2" />
                      Fazer Upgrade Agora
                    </Button>
                  ) : (
                    <div className="inline-flex items-center space-x-3 px-6 py-3 rounded-full bg-burnt-peach text-pure-white border border-burnt-peach-deep shadow-burnt-peach">
                      <Crown className="h-5 w-5" />
                      <span className="font-medium">Plano Ativo - Aproveitando todos os recursos!</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Seção de Cancelamento para usuários Premium */}
      {currentPlan === 'premium' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="max-w-2xl mx-auto"
        >
          <Card className="border border-error-gentle bg-error-soft">
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-error-strong" />
                  <h3 className="text-lg font-medium text-deep-mocha">
                    Cancelar Plano Premium
                  </h3>
                </div>
                
                <p className="text-warm-taupe">
                  Deseja cancelar seu plano Premium? Você manterá acesso aos recursos até o final do período de cobrança atual.
                </p>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-error-gentle text-error-strong hover:bg-error-soft"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar Plano Premium
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-pure-white border border-pale-clay-deep">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-deep-mocha">Cancelar Plano Premium</AlertDialogTitle>
                      <AlertDialogDescription className="text-warm-taupe">
                        Tem certeza que deseja cancelar seu plano Premium? Você perderá acesso a:
                        <br/><br/>
                        • Alertas de preço ilimitados<br/>
                        • Análises de mercado detalhadas<br/>
                        • Tour virtual 3D premium<br/>
                        • Insights personalizados de IA<br/>
                        • Suporte prioritário 24/7
                        <br/><br/>
                        Seu plano será rebaixado para Free no final do período atual.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-pale-clay-deep text-cocoa-taupe hover:bg-pale-clay-light">
                        Manter Premium
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleCancelPremium}
                        className="bg-error-gentle hover:bg-error-strong text-pure-white"
                      >
                        Sim, Cancelar Plano
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {currentPlan === 'free' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="text-center pt-6"
        >
          <Card className="border border-burnt-peach-light bg-burnt-peach-lighter/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-center space-x-3">
                <Crown className="h-5 w-5 text-burnt-peach" />
                <p className="text-warm-taupe">
                  <span className="font-medium text-deep-mocha">Dica:</span> Upgrade para Premium e desbloqueie recursos avançados de IA, alertas ilimitados e análises detalhadas de mercado.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}