import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Search, Star, Sparkles } from 'lucide-react';
import type { User } from '../types/PersonalArea';

interface WelcomeScreenProps {
  onExampleSearch: (query: string) => void;
  user?: User | null;
  onStartSignup: () => void;
  onStartSearch?: () => void;
}

export function WelcomeScreen({ user, onStartSearch }: WelcomeScreenProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const stepItems = [
    { 
      icon: Search, 
      title: "Descreve o que procuras", 
      desc: "Conta-nos em linguagem natural o imóvel ideal para ti - localização, características, orçamento",
      gradient: "from-accent to-accent-blue-light"
    },
    { 
      icon: Sparkles, 
      title: "A IA trabalha por ti", 
      desc: "A nossa inteligência artificial processa o teu pedido e encontra as melhores correspondências",
      gradient: "from-deep-blue-light to-deep-blue-lighter"
    },
    { 
      icon: Star, 
      title: "Descobre o teu lar", 
      desc: "Recebe resultados personalizados e ranqueados pela relevância para o que procuras",
      gradient: "from-muted to-accent"
    }
  ];


  // Mouse tracking - Disable on mobile for performance
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;

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
      className="min-h-[calc(100vh-200px)] flex flex-col"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Subtle Background Elements */}
      <div className="hidden lg:block fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <motion.div
          className="absolute top-1/4 left-10 w-32 h-32 rounded-full blur-3xl"
          style={{ backgroundColor: 'var(--accent-blue-light)' }}
          animate={{
            x: parallaxOffset.x * 2,
            y: parallaxOffset.y * 2,
          }}
          transition={{ type: "spring", stiffness: 30, damping: 20 }}
        />
        <motion.div
          className="absolute bottom-1/4 right-10 w-40 h-40 rounded-full blur-3xl"
          style={{ backgroundColor: 'var(--accent-blue)' }}
          animate={{
            x: parallaxOffset.x * -1.5,
            y: parallaxOffset.y * -1.5,
          }}
          transition={{ type: "spring", stiffness: 30, damping: 20 }}
        />
      </div>

      {/* Hero Section */}
      <motion.div variants={itemVariants} className="flex-1 flex items-center justify-center py-12 lg:py-20">
        <div className="text-center max-w-4xl mx-auto px-4">
          {/* Icon Badge */}
          <motion.div 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-accent">Powered by OpenAI</span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1 
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {user ? (
              <>
                Olá, {user?.name || user?.fullName?.split(' ')[0] || 'utilizador'}! 👋
                <br />
                <span className="text-accent">Pronto para encontrar</span> o teu lar?
              </>
            ) : (
              <>
                Encontra o <span className="text-accent">imóvel perfeito</span>
                <br />
                com inteligência artificial
              </>
            )}
          </motion.h1>
          
          {/* Subtitle */}
          <motion.p 
            className="text-lg sm:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {user ? (
              "Descreve o que procuras e a nossa IA encontra as melhores opções para ti"
            ) : (
              "Pesquisa inteligente de imóveis. Sem cadastro necessário para começar."
            )}
          </motion.p>

          {/* CTA Button */}
          {onStartSearch && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="mb-16"
            >
              <Button
                onClick={onStartSearch}
                size="lg"
                className="h-14 px-8 text-lg font-semibold bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-xl hover:shadow-2xl transition-all duration-300 border-0 group"
              >
                <Sparkles className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
                Começar Pesquisa Inteligente
                <motion.svg
                  className="ml-2 h-5 w-5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </motion.svg>
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Features Grid - Horizontal Flow */}
      <motion.div 
        className="max-w-5xl mx-auto px-4 pb-16"
        variants={containerVariants}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {stepItems.map((step, index) => (
            <motion.div
              key={`step-${step.title}-${index}`}
              variants={cardVariants}
              className="group relative"
            >
              {/* Connecting Arrow - Desktop only */}
              {index < stepItems.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-2 lg:-right-3 transform -translate-y-1/2 z-10">
                  <div className="w-4 h-4 lg:w-5 lg:h-5 rounded-full bg-accent/30 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              )}

              <div className="relative h-full p-5 bg-card rounded-2xl border-2 border-border group-hover:border-accent transition-all duration-300 group-hover:shadow-lg">
                {/* Icon with gradient background */}
                <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center mb-4 mx-auto shadow-blue group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="h-7 w-7 text-primary-foreground" />
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="text-base font-bold text-foreground mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>


    </motion.div>
  );
}