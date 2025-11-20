import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Heart, Search, Bell, Clock, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface OldEmptyStateProps {
  type: 'favorites' | 'searches' | 'alerts' | 'history';
  onAction?: () => void;
}

const emptyStateConfig = {
  favorites: {
    icon: Heart,
    title: 'Nenhuma propriedade favorita',
    description: 'Explore propriedades e marque suas favoritas para acompanhar facilmente.',
    actionLabel: 'Explorar Propriedades',
    iconColor: 'text-accent',
    iconBg: 'bg-accent/20',
  },
  searches: {
    icon: Search,
    title: 'Nenhuma pesquisa salva',
    description: 'Salve suas pesquisas favoritas para receber notificações sobre novas propriedades que correspondam aos seus critérios.',
    actionLabel: 'Fazer Primeira Pesquisa',
    iconColor: 'text-primary',
    iconBg: 'bg-primary/20',
  },
  alerts: {
    icon: Bell,
    title: 'Nenhum alerta configurado',
    description: 'Configure alertas personalizados para ser notificado sobre propriedades que atendam exatamente aos seus critérios.',
    actionLabel: 'Criar Primeiro Alerta',
    iconColor: 'text-accent',
    iconBg: 'bg-accent/20',
  },
  history: {
    icon: Clock,
    title: 'Histórico vazio',
    description: 'Suas propriedades visualizadas aparecerão aqui, facilitando o acompanhamento dos seus interesses.',
    actionLabel: 'Explorar Propriedades',
    iconColor: 'text-muted-foreground',
    iconBg: 'bg-muted',
  }
};

// New EmptyState component with simpler interface
export function EmptyState({ icon: IconComponent, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-center min-h-[400px] p-8"
    >
      <Card className="border border-border bg-card shadow-medium max-w-md w-full">
        <CardContent className="p-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className="flex items-center justify-center w-16 h-16 mx-auto mb-6 bg-muted rounded-full"
          >
            <IconComponent className="h-8 w-8 text-muted-foreground" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="space-y-3 mb-6"
          >
            <h3 className="text-xl font-medium text-foreground">
              {title}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {description}
            </p>
          </motion.div>

          {actionLabel && onAction && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <Button 
                onClick={onAction}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {actionLabel}
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Legacy EmptyState component for backwards compatibility
export function LegacyEmptyState({ type, onAction }: OldEmptyStateProps) {
  const config = emptyStateConfig[type];
  const IconComponent = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-center min-h-[400px] p-8"
    >
      <Card className="border border-border bg-card shadow-medium max-w-md w-full">
        <CardContent className="p-8 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className={`flex items-center justify-center w-16 h-16 mx-auto mb-6 ${config.iconBg} rounded-full`}
          >
            <IconComponent className={`h-8 w-8 ${config.iconColor}`} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="space-y-3 mb-6"
          >
            <h3 className="text-xl font-medium text-foreground">
              {config.title}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {config.description}
            </p>
          </motion.div>

          {onAction && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="space-y-3"
            >
              <Button 
                onClick={onAction}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {config.actionLabel}
              </Button>
            </motion.div>
          )}

          {/* Special message for search history */}
          {type === 'history' && (
            <div className="pt-4 border-t border-border mt-6">
              <div className="flex items-center justify-center space-x-2 text-sm">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  O histórico é salvo automaticamente quando você visualiza propriedades
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}