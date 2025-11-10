import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
//import { Home, Search, MapPin, Star, Sparkles, TrendingUp, Users, Heart } from 'lucide-react';
import { Home, Search, MapPin, Star, Sparkles, Heart } from 'lucide-react';
import type { User } from '../types/PersonalArea';

interface WelcomeScreenProps {
  onExampleSearch: (query: string) => void;
  user?: User | null;
  onStartSignup: () => void;
  onStartSearch?: () => void;
}

export function WelcomeScreen({ user, onStartSearch }: WelcomeScreenProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Pesquisas exemplo para utilizadores com sessão iniciada (apenas explicativas)
  const exampleSearches = [
    {
      text: "Casa com 3 quartos no Porto",
      icon: Home
    },
    {
      text: "Apartamento moderno próximo ao metro",
      icon: MapPin
    },
    {
        text: "Moradia com piscina até 800.000€",
      icon: Home
    },
    {
      text: "Apartamento com vista para o mar",
      icon: Star
    },
    {
        text: "Casa com quintal para animais de estimação",
      icon: Heart
    }
  ];

  const badgeItems = [
    { icon: Sparkles, text: "Powered by OpenAI" }
  ];

  const stepItems = [
    { 
      icon: Search, 
      title: "Pesquise", 
      desc: "Escreve à AI o que procuras num imóvel",
      gradient: "from-burnt-peach-lighter to-burnt-peach-light"
    },
    { 
      icon: Sparkles, 
      title: "IA Analisa", 
      desc: "A nossa AI processar o pedido e aplicar filtros inteligentes",
      gradient: "from-cocoa-taupe-lighter to-cocoa-taupe-light"
    },
    { 
      icon: Star, 
      title: "Encontre", 
      desc: "Vê os resultados mais relevantes ranqueados pela IA",
      gradient: "from-pale-clay-light to-pale-clay-medium"
    }
  ];


  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const parallaxOffset = {
    x: (mousePosition.x - window.innerWidth / 2) * 0.005,
    y: (mousePosition.y - window.innerHeight / 2) * 0.005
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 16 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { 
        duration: 0.3,
        type: "spring" as const,
        stiffness: 120
      }
    }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Subtle Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-24 h-24 rounded-full blur-2xl opacity-30"
          style={{ backgroundColor: 'var(--pale-clay-light)' }}
          animate={{
            x: parallaxOffset.x * 2,
            y: parallaxOffset.y * 2,
          }}
          transition={{ type: "spring", stiffness: 30, damping: 20 }}
        />
        <motion.div
          className="absolute bottom-40 right-40 w-20 h-20 rounded-full blur-2xl opacity-25"
          style={{ backgroundColor: 'var(--burnt-peach-lighter)' }}
          animate={{
            x: parallaxOffset.x * -1.5,
            y: parallaxOffset.y * -1.5,
          }}
          transition={{ type: "spring", stiffness: 30, damping: 20 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full blur-2xl opacity-20"
          style={{ backgroundColor: 'var(--cocoa-taupe-lighter)' }}
          animate={{
            x: parallaxOffset.x * 1,
            y: parallaxOffset.y * 1,
          }}
          transition={{ type: "spring", stiffness: 30, damping: 20 }}
        />
      </div>

      {/* Main Welcome Section */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-none bg-transparent relative overflow-hidden">
          <CardContent className="p-8 text-center relative z-10">
            <motion.div 
              className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6 relative gpu-accelerate"
              style={{
                background: 'linear-gradient(135deg, var(--burnt-peach-light) 0%, var(--burnt-peach) 100%)',
                boxShadow: '0 4px 12px rgba(229, 154, 121, 0.2)'
              }}
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 6px 16px rgba(229, 154, 121, 0.25)"
              }}
              transition={{ duration: 0.3 }}
            >
              <Home className="h-8 w-8 text-white" />
            </motion.div>
            
            <motion.h1 
              className="text-2xl font-medium mb-3"
              style={{ color: 'var(--deep-mocha)' }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              Bem-vindo ao ResideAI
              {user && (
                <motion.span 
                  className="block text-lg mt-2"
                  style={{ color: 'var(--warm-taupe)' }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  Olá, {user?.name || user?.fullName || user?.email}! 👋
                </motion.span>
              )}
            </motion.h1>
            
            <motion.p 
              className="text-base mb-6 max-w-2xl mx-auto leading-relaxed"
              style={{ color: 'var(--warm-taupe)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              {user ? (
                "Começa aqui a tua procura inteligente pelo imóvel certo. Indica o que tens em mente e a nossa AI fará o resto por ti."
              ) : (
                "Descobre milhares de imóveis com a nossa tecnologia de pesquisa alimentada por AI. Para começares as tuas pesquisas personalizadas, cria uma conta gratuita."
              )}
            </motion.p>
            
            <motion.div 
              className="flex justify-center gap-3 mb-6 flex-wrap"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.4 }}
            >
              {badgeItems.map((badge) => (
                <motion.div
                  key={badge.text}
                  className="gpu-accelerate"
                  whileHover={{ scale: 1.03, y: -1 }}
                  transition={{ duration: 0.15 }}
                >
                  <Badge 
                    className="cursor-default px-3 py-2 text-sm font-normal"
                    style={{
                      background: 'var(--pale-clay-light)',
                      color: 'var(--deep-mocha-light)',
                      border: '1px solid var(--pale-clay-deep)'
                    }}
                  >
                    <badge.icon className="h-3.5 w-3.5 mr-2" style={{ color: 'var(--cocoa-taupe)' }} />
                    {badge.text}
                  </Badge>
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* How it Works - Refined and Less Intrusive */}
      <motion.div 
        className="max-w-4xl mx-auto"
        variants={containerVariants}
      >
        <motion.div variants={itemVariants} className="text-center mb-6">
          <h2 className="text-lg font-medium mb-2" style={{ color: 'var(--deep-mocha)' }}>
            Como funciona
          </h2>
          <p className="text-sm" style={{ color: 'var(--warm-taupe-light)' }}>
            Três passos simples para encontrares o teu imóvel ideal
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-3">
          {stepItems.map((step, index) => (
            <motion.div
              key={`step-${step.title}-${index}`}
              variants={cardVariants}
              className="group gpu-accelerate"
            >
              <motion.div
                className="relative p-4 rounded-2xl border gpu-accelerate"
                style={{
                  backgroundColor: 'var(--porcelain-soft)',
                  borderColor: 'var(--pale-clay-medium)',
                  boxShadow: '0 2px 8px rgba(60, 47, 43, 0.04)',
                  willChange: 'transform, box-shadow'
                }}
                whileHover={{ 
                  y: -3,
                  boxShadow: "0 6px 20px rgba(60, 47, 43, 0.08)"
                }}
                transition={{ 
                  duration: 0.15,
                  ease: "easeOut"
                }}
              >
                {/* Step Number */}
                <motion.div 
                  className="absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium gpu-accelerate"
                  style={{
                    backgroundColor: 'var(--burnt-peach)',
                    color: 'white',
                    boxShadow: '0 2px 6px rgba(229, 154, 121, 0.3)',
                    willChange: 'transform'
                  }}
                  whileHover={{ 
                    scale: 1.1
                  }}
                  transition={{ duration: 0.15 }}
                >
                  {index + 1}
                </motion.div>

                {/* Icon Container */}
                <motion.div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 mx-auto relative overflow-hidden gpu-accelerate"
                  style={{ 
                    backgroundColor: 'var(--pale-clay-light)',
                    willChange: 'transform, background-color'
                  }}
                  whileHover={{ 
                    scale: 1.05,
                    backgroundColor: 'var(--burnt-peach-lighter)'
                  }}
                  transition={{ duration: 0.15 }}
                >
                  <motion.div
                    className="absolute inset-0 opacity-0 group-hover:opacity-20"
                    style={{
                      background: `linear-gradient(135deg, var(--burnt-peach-light) 0%, var(--burnt-peach) 100%)`,
                      transition: 'opacity 0.15s ease-out'
                    }}
                  />
                  <step.icon 
                    className="h-6 w-6 relative z-10" 
                    style={{ 
                      color: 'var(--cocoa-taupe)',
                      transition: 'color 0.15s ease-out'
                    }} 
                  />
                </motion.div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="font-medium mb-2 text-base" style={{ color: 'var(--deep-mocha)' }}>
                    {step.title}
                  </h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--warm-taupe)' }}>
                    {step.desc}
                  </p>
                </div>

                {/* Subtle connecting line for larger screens */}
                {index < stepItems.length - 1 && (
                  <motion.div 
                    className="hidden md:block absolute top-1/2 -right-1.5 w-3 h-0.5 opacity-30"
                    style={{ backgroundColor: 'var(--pale-clay-deeper)' }}
                    initial={{ width: 0 }}
                    animate={{ width: '12px' }}
                    transition={{ delay: 0.8 + index * 0.1, duration: 0.4 }}
                  />
                )}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* CTA Button - Apenas para utilizadores autenticados */}
      {user && onStartSearch && (
        <motion.div 
          variants={itemVariants}
          className="flex justify-center my-8"
        >
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              onClick={onStartSearch}
              size="lg"
              className="group relative overflow-hidden h-14 px-8 text-base font-semibold shadow-xl transition-all duration-300 bg-gradient-to-r from-burnt-peach to-burnt-peach-light hover:from-burnt-peach-light hover:to-burnt-peach border-0 text-deep-mocha hover:shadow-2xl shadow-burnt-peach/40 hover:shadow-burnt-peach/50"
            >
              {/* Efeito de brilho animado */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              
              {/* Ícone com animação */}
              <Sparkles className="h-5 w-5 mr-2 group-hover:rotate-12 group-hover:scale-110 transition-transform duration-300 relative z-10" />
              
              <span className="relative z-10">Começar a Pesquisar com AI</span>
              
              {/* Seta animada */}
              <motion.svg
                className="ml-2 h-5 w-5 relative z-10"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
                animate={{ x: [0, 4, 0] }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </motion.svg>
            </Button>
          </motion.div>
        </motion.div>
      )}

      {/* Conditional Content Based on Login Status */}
      {user && (
        /* Example Searches Section - Only for logged users (now explanatory only) */
        <motion.div variants={cardVariants}>
          <Card 
            className="shadow-clay-soft relative overflow-hidden"
            style={{
              backgroundColor: 'var(--pure-white)',
              border: '1px solid var(--pale-clay-medium)'
            }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-base">
                <motion.div 
                  className="w-5 h-5 rounded-lg flex items-center justify-center gpu-accelerate"
                  style={{ backgroundColor: 'var(--burnt-peach-lighter)' }}
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.3 }}
                >
                  <Search className="h-3 w-3" style={{ color: 'var(--burnt-peach-dark)' }} />
                </motion.div>
                <span style={{ color: 'var(--deep-mocha)' }}>Exemplos de pesquisas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <motion.p 
                className="text-sm mb-3"
                style={{ color: 'var(--warm-taupe)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.3 }}
              >
                Podes fazer pesquisas semelhantes a estas usando a barra de pesquisa:
              </motion.p>
              <div className="grid gap-2">
                {exampleSearches.map((search, index) => (
                  <motion.div
                    key={`search-${search.text}-${index}`}
                    className="gpu-accelerate"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + index * 0.05, duration: 0.3 }}
                  >
                    <div
                      className="flex items-center space-x-3 p-3 rounded-lg"
                      style={{
                        backgroundColor: 'var(--porcelain-soft)',
                        border: '1px solid var(--pale-clay-medium)'
                      }}
                    >
                      <motion.div
                        className="w-8 h-8 rounded-lg flex items-center justify-center gpu-accelerate"
                        style={{ 
                          backgroundColor: 'var(--pale-clay-light)',
                          willChange: 'transform, background-color'
                        }}
                        whileHover={{ 
                          scale: 1.05,
                          backgroundColor: 'var(--burnt-peach-lighter)'
                        }}
                        transition={{ duration: 0.15 }}
                      >
                        <search.icon className="h-3.5 w-3.5" style={{ color: 'var(--cocoa-taupe)' }} />
                      </motion.div>
                      <span className="text-sm font-normal" style={{ color: 'var(--deep-mocha-light)' }}>{search.text}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
