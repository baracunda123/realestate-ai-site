import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Home, Search, MapPin, Filter, Star, ArrowRight, TrendingUp, Users, Heart, Sparkles, Check, Crown, Zap } from 'lucide-react';

import type { User } from '../types/PersonalArea';

interface WelcomeScreenProps {
  onExampleSearch: (query: string) => void;
  user?: User | null;
  onStartSignup: () => void;
}

export function WelcomeScreen({ onExampleSearch, user, onStartSignup }: WelcomeScreenProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [counters, setCounters] = useState({
    properties: 0,
    users: 0,
    matches: 0
  });

  // Pesquisas exemplo para utilizadores com sessão iniciada
  const exampleSearches = [
    {
      text: "Casa com 3 quartos em São Paulo",
      icon: Home
    },
    {
      text: "Apartamento moderno próximo ao metro",
      icon: MapPin
    },
    {
      text: "Sobrado com piscina até R$ 800.000",
      icon: Home
    },
    {
      text: "Cobertura com vista para o mar",
      icon: Star
    },
    {
      text: "Casa com quintal para pets",
      icon: Heart
    }
  ];

  const stats = [
    { label: "Propriedades", value: 15420, icon: Home, target: 15420 },
    { label: "Usuários Ativos", value: 8350, icon: Users, target: 8350 },
    { label: "Matches IA", value: 12890, icon: TrendingUp, target: 12890 }
  ];


  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Animated counters
  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const stepTime = duration / steps;

    stats.forEach((stat, index) => {
      let currentStep = 0;
      const increment = stat.target / steps;
      
      const timer = setInterval(() => {
        if (currentStep < steps) {
          setCounters(prev => ({
            ...prev,
            [index === 0 ? 'properties' : index === 1 ? 'users' : 'matches']: Math.floor(increment * currentStep)
          }));
          currentStep++;
        } else {
          setCounters(prev => ({
            ...prev,
            [index === 0 ? 'properties' : index === 1 ? 'users' : 'matches']: stat.target
          }));
          clearInterval(timer);
        }
      }, stepTime);
    });
  }, []);

  const parallaxOffset = {
    x: (mousePosition.x - window.innerWidth / 2) * 0.01,
    y: (mousePosition.y - window.innerHeight / 2) * 0.01
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 30 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { 
        duration: 0.4,
        type: "spring" as const,
        stiffness: 100
      }
    }
  };

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-20 w-32 h-32 rounded-full blur-xl"
          style={{ backgroundColor: 'rgba(184, 194, 168, 0.15)' }}
          animate={{
            x: parallaxOffset.x * 2,
            y: parallaxOffset.y * 2,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 20 }}
        />
        <motion.div
          className="absolute bottom-40 right-40 w-24 h-24 rounded-full blur-xl"
          style={{ backgroundColor: 'rgba(168, 184, 150, 0.15)' }}
          animate={{
            x: parallaxOffset.x * -1.5,
            y: parallaxOffset.y * -1.5,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 20 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full blur-xl"
          style={{ backgroundColor: 'rgba(165, 183, 149, 0.1)' }}
          animate={{
            x: parallaxOffset.x * 1,
            y: parallaxOffset.y * 1,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 20 }}
        />
      </div>

      {/* Main Welcome Section */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-none bg-transparent relative overflow-hidden">
          <CardContent className="p-12 text-center relative z-10">
            <motion.div 
              className="mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 relative bg-primary shadow-burnt-peach"
              whileHover={{ 
                scale: 1.1, 
                rotate: 360,
                boxShadow: "0 0 30px rgba(229, 154, 121, 0.5)"
              }}
              transition={{ duration: 0.6 }}
            >
              <Home className="h-10 w-10 text-white" />
              
              {/* Pulse effect */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: 'rgba(229, 154, 121, 0.3)' }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 0, 0.7]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
            
            <motion.h1 
              className="text-3xl font-medium text-foreground mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              Bem-vindo ao HomeFinder AI
              {user && (
                <motion.span 
                  className="block text-xl text-muted-foreground mt-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  Olá, {user?.name || user?.fullName || user?.email}! 👋
                </motion.span>
              )}
            </motion.h1>
            
            <motion.p 
              className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {user ? (
                "Sua busca inteligente por propriedades começa aqui. Use linguagem natural e deixe nossa IA encontrar exatamente o que você procura."
              ) : (
                "Descubra milhares de propriedades com nossa tecnologia de busca alimentada por IA. Para começar suas pesquisas personalizadas, você precisa criar uma conta gratuita."
              )}
            </motion.p>
            
            <motion.div 
              className="flex justify-center gap-4 mb-8 flex-wrap"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {[
                { icon: Sparkles, text: "IA Integrada" },
                { icon: MapPin, text: "Mapa Interativo" },
                { icon: Filter, text: "Filtros Inteligentes" }
              ].map((badge, index) => (
                <motion.div
                  key={badge.text}
                  whileHover={{ scale: 1.08, y: -3 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Badge className="bg-secondary text-white border border-cocoa-strong shadow-cocoa-taupe cursor-default px-4 py-2">
                    <badge.icon className="h-4 w-4 mr-2" />
                    <span className="font-medium">{badge.text}</span>
                  </Badge>
                </motion.div>
              ))}
            </motion.div>

            {/* Animated Stats */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-8"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="flex items-center justify-center mb-2">
                    <stat.icon className="h-5 w-5 text-primary mr-2" />
                    <motion.span 
                      className="text-2xl font-medium text-foreground"
                      key={Object.values(counters)[index]}
                    >
                      {Object.values(counters)[index].toLocaleString()}
                    </motion.span>
                  </div>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* How it Works */}
      <motion.div 
        className="grid md:grid-cols-3 gap-6"
        variants={containerVariants}
      >
        {[
          { icon: Search, title: "1. Pesquise", desc: "Use linguagem natural para descrever o que você procura" },
          { icon: Sparkles, title: "2. IA Analisa", desc: "Nossa IA processa sua pesquisa e aplica filtros inteligentes" },
          { icon: Star, title: "3. Encontre", desc: "Veja resultados ranqueados pela relevância da IA" }
        ].map((step, index) => (
          <motion.div
            key={`step-${step.title}-${index}`}
            variants={cardVariants}
            whileHover={{ 
              y: -8,
              boxShadow: "0 8px 20px rgba(60, 47, 43, 0.15)"
            }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Card 
              className="h-full"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E4D8D0',
                boxShadow: '0 4px 12px rgba(60, 47, 43, 0.12)'
              }}
            >
              <CardContent className="p-6 text-center">
                <motion.div 
                  className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4"
                  whileHover={{ 
                    scale: 1.1,
                    backgroundColor: 'var(--sage-forest-breath)',
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <step.icon className="h-6 w-6 text-muted-foreground" />
                </motion.div>
                <h3 className="font-medium text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Conditional Content Based on Login Status */}
      {user && (
        /* Example Searches Section - Only for logged users */
        <motion.div variants={cardVariants}>
          <Card className="border border-border bg-card shadow-sm relative overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <motion.div 
                  className="w-6 h-6 bg-sage-calm rounded-lg flex items-center justify-center"
                  whileHover={{ rotate: 180 }}
                  transition={{ duration: 0.3 }}
                >
                  <Search className="h-3 w-3 text-white" />
                </motion.div>
                <span className="text-foreground">Pesquisas de exemplo</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <motion.p 
                className="text-sm text-muted-foreground mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                Clique em qualquer exemplo abaixo ou use a barra de pesquisa acima:
              </motion.p>
              <div className="grid gap-3">
                {exampleSearches.map((search, index) => (
                  <motion.div
                    key={`search-${search.text}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 + index * 0.1, duration: 0.4 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      onClick={() => onExampleSearch(search.text)}
                      className="justify-between text-left h-auto p-4 border border-border bg-pure-white hover:border-sage-gentle hover:bg-cream-white transition-all duration-200 w-full group relative overflow-hidden"
                      onMouseEnter={() => setHoveredCard(index)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      {/* Subtle background on hover */}
                      <motion.div
                        className="absolute inset-0 bg-sage-breath opacity-0 group-hover:opacity-20"
                        layoutId="searchHover"
                      />
                      
                      <div className="flex items-center space-x-3 relative z-10">
                        <motion.div
                          animate={{ 
                            rotate: hoveredCard === index ? 360 : 0,
                            scale: hoveredCard === index ? 1.1 : 1
                          }}
                          transition={{ duration: 0.3 }}
                        >
                          <search.icon className="h-4 w-4 text-primary" />
                        </motion.div>
                        <span className="text-foreground">{search.text}</span>
                      </div>
                      
                      <motion.div
                        animate={{ x: hoveredCard === index ? 5 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    </Button>
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
