import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Bell, 
  BellRing,
  Check,
  CheckCheck,
  RefreshCw,
  MapPin,
  Euro,
  Clock,
  TrendingDown
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { alertNotificationUtils } from '../../api/alert-notifications.service';
import type { PropertyAlertNotification } from '../../types/PersonalArea';

interface NotificationItemProps {
  notification: PropertyAlertNotification;
  onMarkAsRead: (id: string) => Promise<void>;
}

function NotificationItem({ 
  notification, 
  onMarkAsRead
}: NotificationItemProps) {
  const [processing, setProcessing] = useState(false);

  const handleMarkAsRead = async () => {
    if (notification.isRead) return;
    
    setProcessing(true);
    try {
      await onMarkAsRead(notification.id);
    } finally {
      setProcessing(false);
    }
  };

  const isUnread = !notification.isRead;
  const isRecent = alertNotificationUtils.isRecent(notification.createdAt);
  const relativeTime = alertNotificationUtils.formatRelativeTime(notification.createdAt);
  const priceChange = alertNotificationUtils.formatPriceChange(
    notification.currentPrice, 
    notification.oldPrice
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="group"
    >
      <Card className={`alert-notification-card border shadow-clay-soft ${isUnread ? 'unread border-burnt-peach-light' : 'border-pale-clay-deep bg-pure-white'}`}>
        <CardContent className="p-3">
          <div className="flex items-start space-x-3">
            <div className={`notification-icon p-1.5 ${isUnread ? 'bg-burnt-peach/20' : 'bg-pale-clay'}`}>
              <TrendingDown className="icon h-4 w-4 text-success-strong" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <h4 className={`text-sm font-medium ${isUnread ? 'text-burnt-peach' : 'text-title'} line-clamp-2`}>
                  💰 Redução de Preço
                </h4>
                {isRecent && (
                  <Badge variant="secondary" className="text-xs ml-2 shadow-clay-soft">
                    Novo
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-warm-taupe line-clamp-2 mb-2">
                {notification.propertyTitle}
              </p>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  {notification.propertyLocation && (
                    <div className="flex items-center text-clay-secondary">
                      <MapPin className="h-3 w-3 mr-1" />
                      {notification.propertyLocation}
                    </div>
                  )}
                  
                  {notification.currentPrice && (
                    <div className="flex items-center text-clay-secondary">
                      <Euro className="h-3 w-3 mr-1" />
                      €{notification.currentPrice.toLocaleString('pt-PT')}
                    </div>
                  )}
                  
                  {priceChange && (
                    <span className="text-success-strong font-medium bg-success-soft px-2 py-0.5 rounded-full">
                      {priceChange}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center text-clay-secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {relativeTime}
                </div>
              </div>
            </div>
            
            {/* Botão para marcar como lida */}
            {isUnread && (
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="notification-mark-read h-6 w-6 hover:bg-success-gentle hover:text-pure-white"
                  onClick={handleMarkAsRead}
                  disabled={processing}
                  title="Marcar como lida"
                >
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface DashboardAlertNotificationsProps {
  limit?: number;
}

export function DashboardAlertNotifications({ 
  limit = 5 
}: DashboardAlertNotificationsProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    markAsRead,
    markAllAsRead,
    refresh
  } = useNotifications(30000); // Polling a cada 30 segundos

  // Limitar as notificações exibidas
  const displayNotifications = notifications.slice(0, limit);

  if (isLoading) {
    return (
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-burnt-peach" />
            <span>Notificações de Alertas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-porcelain rounded-lg h-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (displayNotifications.length === 0) {
    return (
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-burnt-peach" />
              <span>Notificações de Alertas</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BellRing className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Sem notificações
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Você será notificado quando houver reduções de preço nas propriedades dos seus alertas
            </p>
            <Button onClick={refresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Verificar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="dashboard-section-card border border-pale-clay-deep bg-pure-white shadow-clay-medium">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-burnt-peach" />
            <CardTitle className="text-title">Notificações de Alertas</CardTitle>
            {unreadCount > 0 && (
              <Badge className="bg-burnt-peach text-pure-white shadow-burnt-peach border-0">
                {unreadCount} nova{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs hover:bg-success-gentle/20 hover:text-success-strong transition-all duration-200"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Marcar todas
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={isRefreshing}
              className="hover:bg-burnt-peach/10 hover:text-burnt-peach transition-all duration-200 hover:scale-105"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {unreadCount > 0 && (
          <p className="text-sm text-warm-taupe">
            {unreadCount} notificação{unreadCount > 1 ? 's' : ''} não lida{unreadCount > 1 ? 's' : ''}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-3">
            <AnimatePresence>
              {displayNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                />
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
        
        {notifications.length > limit && (
          <div className="mt-4 text-center">
            <p className="text-xs text-warm-taupe">
              Mostrando {limit} de {notifications.length} notificações
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}