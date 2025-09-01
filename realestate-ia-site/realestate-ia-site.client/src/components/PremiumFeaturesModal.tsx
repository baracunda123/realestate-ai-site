import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  Search, 
  Heart, 
  Eye, 
  Archive, 
  Target, 
  Crown, 
  Sparkles, 
  ArrowRight,
  Check,
  Zap,
  Star,
  Shield
} from 'lucide-react';

interface PremiumFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

export function PremiumFeaturesModal({ isOpen, onClose, onUpgrade }: PremiumFeaturesModalProps) {
  const premiumFeatures = [
    {
      icon: Search,
      title: "Pesquisas Ilimitadas",
      description: "Realize quantas pesquisas quiser, sem limitações.",
      color: "bg-pale-clay",
      iconColor: "text-burnt-peach-dark"
    },
    {
      icon: Heart,
      title: "Favoritos Sem Limitações",
      description: "Salve quantas propriedades desejar em seus favoritos.",
      color: "bg-pale-clay",
      iconColor: "text-burnt-peach-dark"
    },
    {
      icon: Eye,
      title: "Histórico de Visualizações",
      description: "Tenha acesso completo ao histórico de todos os imóveis.",
      color: "bg-pale-clay",
      iconColor: "text-burnt-peach-dark"
    },
    {
      icon: Archive,
      title: "Anúncios Arquivados",
      description: "Veja propriedades que já não estão disponíveis.",
      color: "bg-pale-clay",
      iconColor: "text-burnt-peach-dark"
    },
    {
      icon: Target,
      title: "Recomendações IA",
      description: "Receba sugestões inteligentes personalizadas.",
      color: "bg-pale-clay",
      iconColor: "text-burnt-peach-dark"
    }
  ];

  const quickBenefits = [
    { icon: Sparkles, text: "Pesquisas ∞" },
    { icon: Star, text: "Favoritos ∞" },
    { icon: Shield, text: "Histórico Total" }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.9 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] overflow-y-auto bg-pure-white border-pale-clay-deep sm:max-w-[90vw] lg:max-w-[85vw] xl:max-w-[80vw]">
        
        {/* Mobile Layout */}
        <div className="block lg:hidden">
          <DialogHeader className="pb-4">
            <motion.div
              variants={headerVariants}
              initial="hidden"
              animate="visible"
              className="text-center space-y-3"
            >
              <div className="flex items-center justify-center space-x-2">
                <motion.div 
                  className="w-10 h-10 bg-burnt-peach rounded-xl flex items-center justify-center shadow-burnt-peach"
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Crown className="h-5 w-5 text-pure-white" />
                </motion.div>
                <DialogTitle className="text-xl font-semibold text-deep-mocha">
                  Premium
                </DialogTitle>
              </div>
              
              <DialogDescription className="text-base text-warm-taupe leading-relaxed">
                Desbloqueie todas as funcionalidades exclusivas
              </DialogDescription>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Badge className="bg-burnt-peach-dark text-pure-white border-0 px-3 py-1 shadow-clay-whisper">
                  <Sparkles className="h-3 w-3 mr-1" />
                  R$ 29,90/mês
                </Badge>
              </motion.div>

              {/* Quick Benefits - Mobile */}
              <div className="flex justify-center space-x-4 pt-2">
                {quickBenefits.map((benefit, index) => (
                  <motion.div
                    key={benefit.text}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex items-center space-x-1 text-xs text-warm-taupe"
                  >
                    <benefit.icon className="h-3 w-3 text-burnt-peach" />
                    <span>{benefit.text}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </DialogHeader>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {/* Features - Mobile Compact */}
            <div className="space-y-2">
              {premiumFeatures.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  variants={itemVariants}
                  whileHover={{ scale: 1.01 }}
                  className="bg-pale-clay rounded-lg p-3 border border-cocoa-taupe/20 shadow-clay-soft"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 ${feature.color} rounded-lg flex items-center justify-center flex-shrink-0 border border-cocoa-taupe/20`}>
                      <feature.icon className={`h-4 w-4 ${feature.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-deep-mocha">{feature.title}</h3>
                      <p className="text-xs text-warm-taupe leading-relaxed">{feature.description}</p>
                    </div>
                    <Check className="h-4 w-4 text-burnt-peach flex-shrink-0" />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Action Buttons - Mobile */}
            <motion.div variants={itemVariants} className="space-y-2 pt-2">
              <Button
                onClick={onUpgrade}
                className="w-full bg-burnt-peach hover:bg-burnt-peach-light text-deep-mocha font-semibold shadow-burnt-peach border-0 h-12 transition-all duration-200"
              >
                <Crown className="h-4 w-4 mr-2" />
                Fazer Upgrade
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full border-pale-clay-deep bg-pure-white text-warm-taupe hover:bg-pale-clay-light h-10"
              >
                Talvez Depois
              </Button>
            </motion.div>

            {/* Footer - Mobile */}
            <motion.div variants={itemVariants} className="text-center pt-2">
              <p className="text-xs text-warm-taupe">
                ✓ Cancele quando quiser • ✓ Sem taxas ocultas
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:block">
          <DialogHeader className="pb-6">
            <motion.div
              variants={headerVariants}
              initial="hidden"
              animate="visible"
              className="text-center space-y-4"
            >
              <div className="flex items-center justify-center space-x-3">
                <motion.div 
                  className="w-12 h-12 bg-burnt-peach rounded-xl flex items-center justify-center shadow-burnt-peach"
                  whileHover={{ scale: 1.1, rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <Crown className="h-6 w-6 text-pure-white" />
                </motion.div>
                <DialogTitle className="text-2xl font-semibold text-deep-mocha">
                  Descubra o Premium
                </DialogTitle>
              </div>
              
              <DialogDescription className="text-lg text-warm-taupe max-w-2xl mx-auto leading-relaxed">
                Desbloqueie funcionalidades exclusivas e tenha uma experiência completa de busca imobiliária
              </DialogDescription>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Badge className="bg-burnt-peach-dark text-pure-white border-0 px-4 py-2 text-base shadow-clay-whisper">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Apenas R$ 29,90/mês
                </Badge>
              </motion.div>
            </motion.div>
          </DialogHeader>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 xl:grid-cols-3 gap-6"
          >
            
            {/* Left Column - Features List (Desktop) */}
            <div className="xl:col-span-2 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {premiumFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02, y: -4 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Card className="border border-cocoa-taupe/20 bg-pale-clay shadow-clay-soft h-full">
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <motion.div 
                            className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center flex-shrink-0 border border-cocoa-taupe/20`}
                            whileHover={{ scale: 1.1, rotate: 8 }}
                            transition={{ duration: 0.3 }}
                          >
                            <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
                          </motion.div>
                          
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-deep-mocha mb-1">
                              {feature.title}
                            </h3>
                            <p className="text-sm text-warm-taupe leading-relaxed">
                              {feature.description}
                            </p>
                          </div>
                          
                          <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + index * 0.1 }}
                          >
                            <Check className="h-5 w-5 text-burnt-peach flex-shrink-0" />
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Right Column - Premium Summary (Desktop) */}
            <div className="xl:col-span-1 space-y-4">
              
              {/* Premium Card */}
              <motion.div variants={itemVariants}>
                <Card className="border border-pale-clay shadow-clay-soft bg-pure-white relative overflow-hidden h-full">
                  <motion.div
                    className="absolute inset-0 opacity-5"
                    animate={{
                      background: [
                        "radial-gradient(circle at 0% 50%, rgba(228, 216, 208, 0.05) 0%, transparent 50%)",
                        "radial-gradient(circle at 100% 50%, rgba(228, 216, 208, 0.05) 0%, transparent 50%)",
                        "radial-gradient(circle at 0% 50%, rgba(228, 216, 208, 0.05) 0%, transparent 50%)"
                      ]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <CardContent className="p-6 relative z-10 h-full flex flex-col justify-between">
                    <div className="text-center space-y-4">
                      <motion.div
                        animate={{ 
                          rotate: [0, 5, -5, 0],
                          scale: [1, 1.05, 1]
                        }}
                        transition={{ 
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Crown className="h-8 w-8 mx-auto text-burnt-peach-dark" />
                      </motion.div>
                      
                      <h3 className="text-xl font-semibold text-deep-mocha">
                        Premium Experience
                      </h3>
                      <p className="text-warm-taupe text-sm">
                        Transforme sua busca por imóveis com acesso total
                      </p>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-2">
                          <div className="text-center py-2 bg-pure-white rounded-lg border border-pale-clay">
                            <div className="text-2xl font-bold text-deep-mocha">∞</div>
                            <div className="text-warm-taupe text-xs">Pesquisas</div>
                          </div>
                          <div className="text-center py-2 bg-pure-white rounded-lg border border-pale-clay">
                            <div className="text-2xl font-bold text-deep-mocha">∞</div>
                            <div className="text-warm-taupe text-xs">Favoritos</div>
                          </div>
                          <div className="text-center py-2 bg-pure-white rounded-lg border border-pale-clay">
                            <div className="text-2xl font-bold text-deep-mocha">100%</div>
                            <div className="text-warm-taupe text-xs">Acesso</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Action Buttons - Desktop */}
              <motion.div variants={itemVariants} className="space-y-3">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={onUpgrade}
                    className="w-full bg-burnt-peach hover:bg-burnt-peach-light text-deep-mocha font-semibold shadow-burnt-peach border-0 h-12 text-base transition-all duration-200"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Fazer Upgrade Agora
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </motion.div>
                
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={onClose}
                    variant="outline"
                    className="w-full border-pale-clay-deep bg-pure-white text-warm-taupe hover:bg-pale-clay-light h-10"
                  >
                    Talvez Depois
                  </Button>
                </motion.div>
              </motion.div>

              {/* Footer - Desktop */}
              <motion.div variants={itemVariants} className="text-center">
                <p className="text-xs text-warm-taupe">
                  ✓ Cancele quando quiser<br />
                  ✓ Sem taxas ocultas<br />
                  ✓ Suporte 24/7
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}