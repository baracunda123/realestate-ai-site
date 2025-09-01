import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Crown, Check, Zap, Eye } from 'lucide-react';
import type { User } from '../../types/PersonalArea';

interface PersonalAreaPlansProps {
  user: User;
  currentPlan: string;
  onReactivateFreePlan: () => void;
  onCancelCurrentPlan: () => void;
  onOpenUpgradeModal?: () => void;
}

export function PersonalAreaPlans({ 
  user, 
  currentPlan, 
  onReactivateFreePlan, 
  onCancelCurrentPlan, 
  onOpenUpgradeModal 
}: PersonalAreaPlansProps) {
  const [hoveredPlan, setHoveredPlan] = useState<number | null>(null);

  const plans = [
    {
      name: "Free",
      price: "Gratuito",
      description: "Acesso básico com limitações",
      icon: Check,
      color: "bg-porcelain border-pale-clay-deep shadow-clay-soft",
      features: [
        "Busca básica por propriedades",
        "Até 3 propriedades favoritas",
        "1 pesquisa salva por vez",
        "Visualização de mapa básica",
        "Alertas básicos de preço",
        "Suporte por email"
      ],
      popular: true
    },
    {
      name: "Premium",
      price: "R$ 29,90",
      description: "Recursos avançados de IA",
      icon: Crown,
      color: "bg-cocoa-taupe border-cocoa-taupe-deep shadow-cocoa-taupe",
      features: [
        "Busca avançada com IA completa",
        "Propriedades favoritas ilimitadas",
        "Pesquisas salvas ilimitadas",
        "Alertas de preço personalizados",
        "Análises de mercado detalhadas",
        "Tour virtual 3D premium",
        "Suporte prioritário 24/7",
        "Relatórios de investimento",
        "Insights personalizados de IA"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {user.isPremium ? (
              <Crown className="h-5 w-5 text-burnt-peach-dark" />
            ) : (
              <Eye className="h-5 w-5 text-cocoa-taupe" />
            )}
            <span className="text-deep-mocha">Seu Plano Atual</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="font-medium text-foreground">
                  Plano {user.isPremium ? 'Premium' : 'Free'}
                </h3>
                <Badge className={user.isPremium ? 'bg-burnt-peach text-pure-white border-0' : 'bg-pale-clay-deep text-deep-mocha border-0'}>
                  {user.isPremium ? (
                    <>
                      <Crown className="h-3 w-3 mr-1" />
                      Ativo
                    </>
                  ) : (
                    <>
                      <Eye className="h-3 w-3 mr-1" />
                      Ativo
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {user.isPremium 
                  ? "Você tem acesso completo a todas as funcionalidades premium"
                  : "Você está usando o plano gratuito com limitações"
                }
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {user.isPremium ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-error-gentle text-error-strong hover:bg-error-soft"
                    >
                      Cancelar Plano
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Cancelar Plano Premium</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja cancelar seu plano Premium? Você manterá o acesso 
                        até o final do período atual, depois será downgraded para o plano Free.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Manter Premium</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-error-gentle hover:bg-error-strong"
                        onClick={onCancelCurrentPlan}
                      >
                        Cancelar Plano
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button 
                  className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white"
                  onClick={onOpenUpgradeModal}
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Fazer Upgrade
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans Comparison */}
      <div>
        <div className="text-center mb-16">
          <h2 className="text-2xl font-medium text-foreground mb-2">Compare os Planos</h2>
          <p className="text-warm-taupe">Escolha o plano ideal para suas necessidades imobiliárias</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto pt-4">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ 
                delay: index * 0.2,
                duration: 0.6,
                type: "spring",
                stiffness: 120
              }}
              whileHover={{ 
                y: -12,
                scale: 1.03,
                transition: { duration: 0.3 }
              }}
              onMouseEnter={() => setHoveredPlan(index)}
              onMouseLeave={() => setHoveredPlan(null)}
              className="relative group"
            >
              {/* Glow Effect */}
              <motion.div
                className={`absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  plan.name === 'Premium' 
                    ? 'bg-gradient-to-r from-burnt-peach-light via-burnt-peach to-burnt-peach-deep blur-xl'
                    : 'bg-gradient-to-r from-pale-clay-deep via-cocoa-taupe-light to-pale-clay-darker blur-lg'
                }`}
                animate={{
                  opacity: hoveredPlan === index ? 0.3 : 0,
                }}
                transition={{ duration: 0.3 }}
              />

              {/* Popular Badge */}
              {plan.popular && (
                <motion.div
                  className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20"
                  initial={{ opacity: 0, y: -20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                >
                  <div className="relative">
                    <div className="bg-gradient-to-r from-burnt-peach to-burnt-peach-deep text-pure-white px-6 py-2 rounded-full shadow-burnt-peach">
                      <div className="flex items-center space-x-2">
                        <Zap className="h-4 w-4" />
                        <span className="font-medium text-sm">Mais Popular</span>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-burnt-peach to-burnt-peach-deep rounded-full blur-md opacity-50 -z-10"></div>
                  </div>
                </motion.div>
              )}

              {/* Current Plan Badge */}
              {((user.isPremium && plan.name === 'Premium') || (!user.isPremium && plan.name === 'Free')) && (
                <motion.div
                  className="absolute -top-3 right-4 z-20"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1, duration: 0.4 }}
                >
                  <div className="bg-success-gentle text-pure-white px-4 py-1 rounded-full shadow-clay-soft border border-success-strong">
                    <span className="text-sm font-medium">Plano Atual</span>
                  </div>
                </motion.div>
              )}

              <Card className={`relative overflow-hidden border-2 transition-all duration-500 ${
                plan.name === 'Premium' 
                  ? 'bg-gradient-to-br from-cocoa-taupe via-cocoa-taupe-deep to-cocoa-taupe-darker border-cocoa-taupe-light shadow-clay-deep'
                  : 'bg-gradient-to-br from-pure-white via-porcelain to-pale-clay-light border-pale-clay-deep shadow-clay-soft'
              } ${hoveredPlan === index ? 'shadow-clay-strong border-opacity-60' : ''}`}>
                
                {/* Animated Background Pattern */}
                <motion.div
                  className={`absolute inset-0 opacity-0 ${
                    plan.name === 'Premium'
                      ? 'bg-gradient-to-br from-burnt-peach/10 via-transparent to-burnt-peach-light/5'
                      : 'bg-gradient-to-br from-burnt-peach/5 via-transparent to-cocoa-taupe/5'
                  }`}
                  animate={{
                    opacity: hoveredPlan === index ? 1 : 0,
                  }}
                  transition={{ duration: 0.5 }}
                />

                {/* Header Section */}
                <CardHeader className="text-center pb-4 relative z-10 pt-8">
                  {/* Icon with Glow */}
                  <motion.div 
                    className="relative mx-auto mb-6"
                    whileHover={{ 
                      scale: 1.1,
                      rotate: [0, -5, 5, 0],
                    }}
                    transition={{ duration: 0.6 }}
                  >
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center relative ${
                      plan.name === 'Premium' 
                        ? 'bg-gradient-to-br from-burnt-peach to-burnt-peach-deep shadow-burnt-peach'
                        : 'bg-gradient-to-br from-pale-clay-light to-pale-clay-deep shadow-clay-medium'
                    }`}>
                      <plan.icon className={`h-10 w-10 ${
                        plan.name === 'Premium' ? 'text-pure-white' : 'text-cocoa-taupe-dark'
                      }`} />
                      
                      {/* Glow Effect */}
                      <motion.div
                        className={`absolute inset-0 rounded-2xl ${
                          plan.name === 'Premium' 
                            ? 'bg-burnt-peach' 
                            : 'bg-cocoa-taupe-light'
                        } opacity-0 blur-lg`}
                        animate={{
                          opacity: hoveredPlan === index ? 0.4 : 0,
                          scale: hoveredPlan === index ? 1.2 : 1,
                        }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </motion.div>
                  
                  {/* Plan Name */}
                  <CardTitle className={`text-2xl mb-3 ${
                    plan.name === 'Premium' ? 'text-pure-white' : 'text-deep-mocha'
                  }`}>
                    <motion.span
                      animate={hoveredPlan === index ? { scale: 1.05 } : { scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      Plano {plan.name}
                    </motion.span>
                  </CardTitle>
                  
                  {/* Price */}
                  <motion.div 
                    className={`mb-3 ${
                      plan.name === 'Premium' ? 'text-burnt-peach-lighter' : 'text-burnt-peach'
                    }`}
                    animate={hoveredPlan === index ? { scale: 1.1 } : { scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.price !== 'Gratuito' && (
                      <span className={`text-lg font-normal ml-1 ${
                        plan.name === 'Premium' ? 'text-pure-white/80' : 'text-warm-taupe'
                      }`}>
                        /mês
                      </span>
                    )}
                  </motion.div>
                  
                  {/* Description */}
                  <p className={`text-sm leading-relaxed ${
                    plan.name === 'Premium' ? 'text-pure-white/90' : 'text-warm-taupe'
                  }`}>
                    {plan.description}
                  </p>
                </CardHeader>

                {/* Features Section */}
                <CardContent className="relative z-10 px-6 pb-8">
                  <div className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.div
                        key={featureIndex}
                        className="flex items-start space-x-3 group/feature"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          delay: 0.5 + featureIndex * 0.1,
                          duration: 0.4
                        }}
                        whileHover={{ x: 4 }}
                      >
                        <motion.div
                          className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                            plan.name === 'Premium' 
                              ? 'bg-burnt-peach-lighter text-cocoa-taupe-dark' 
                              : 'bg-success-soft text-success-strong'
                          }`}
                          whileHover={{ scale: 1.2, rotate: 180 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Check className="h-3 w-3" />
                        </motion.div>
                        <span className={`text-sm leading-relaxed font-medium ${
                          plan.name === 'Premium' ? 'text-pure-white/95' : 'text-deep-mocha'
                        } group-hover/feature:translate-x-1 transition-transform duration-200`}>
                          {feature}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative"
                  >
                    {plan.name === 'Premium' ? (
                      user.isPremium ? (
                        <Button 
                          disabled 
                          className="w-full bg-success-gentle text-pure-white cursor-not-allowed py-3 text-base font-medium shadow-clay-soft border border-success-strong"
                        >
                          <Check className="h-5 w-5 mr-2" />
                          Plano Atual
                        </Button>
                      ) : (
                        <Button 
                          className="w-full bg-gradient-to-r from-burnt-peach to-burnt-peach-deep text-pure-white hover:from-burnt-peach-light hover:to-burnt-peach shadow-burnt-peach py-3 text-base font-medium border-0 relative overflow-hidden group"
                          onClick={onOpenUpgradeModal}
                        >
                          <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-burnt-peach-light to-burnt-peach opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          />
                          <span className="relative flex items-center justify-center">
                            <Crown className="h-5 w-5 mr-2" />
                            Assinar Premium
                          </span>
                        </Button>
                      )
                    ) : (
                      user.isPremium ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline"
                              className="w-full border-2 border-burnt-peach text-burnt-peach hover:bg-burnt-peach-lighter hover:border-burnt-peach-deep py-3 text-base font-medium"
                            >
                              <Eye className="h-5 w-5 mr-2" />
                              Voltar para Free
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Voltar para Plano Free</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja voltar para o plano Free? Você perderá acesso 
                                a todas as funcionalidades premium, incluindo alertas ilimitados e insights de IA.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Manter Premium</AlertDialogCancel>
                              <AlertDialogAction onClick={onReactivateFreePlan}>
                                Voltar para Free
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button 
                          disabled 
                          className="w-full bg-success-gentle text-pure-white cursor-not-allowed py-3 text-base font-medium shadow-clay-soft border border-success-strong"
                        >
                          <Check className="h-5 w-5 mr-2" />
                          Plano Atual
                        </Button>
                      )
                    )}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>


    </div>
  );
}