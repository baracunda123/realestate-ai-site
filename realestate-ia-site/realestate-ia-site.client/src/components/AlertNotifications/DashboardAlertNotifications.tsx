import { useState, useEffect } from 'react';
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
  Trash2,
  RefreshCw,
  MapPin,
  Euro,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getRecentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  alertNotificationUtils,
  type PropertyAlertNotification 
} from '../../api/alert-notifications.service';

interface NotificationItemProps {
  notification: PropertyAlertNotification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ 
  notification, 
  onMarkAsRead, 
  onDelete 
}: NotificationItemProps) {
  const [processing, setProcessing] = useState(false);

  const handleMarkAsRead = async () => {
    if (notification.readAt) return;
    
    setProcessing(true);
    try {
      await markNotificationAsRead(notification.id);
      onMarkAsRead(notification.id);
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
      toast.error('Erro ao marcar notificação como lida');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    setProcessing(true);
    try {
      await deleteNotification(notification.id);
      onDelete(notification.id);
      toast.success('Notificação removida');
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      toast.error('Erro ao remover notificação');
    } finally {
      setProcessing(false);
    }
  };

  const isUnread = !notification.readAt;
  const isRecent = alertNotificationUtils.isRecent(notification.createdAt);
  const alertTypeIcon = alertNotificationUtils.getAlertTypeIcon(notification.alertType);
  const relativeTime = alertNotificationUtils.formatRelativeTime(notification.createdAt);
  const priceChange = alertNotificationUtils.formatPriceChange(
    notification.propertyPrice, 
    notification.oldPrice
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="group"
    >
      <Card className={`border ${isUnread ? 'border-burnt-peach bg-burnt-peach/5' : 'border-pale-clay-deep bg-pure-white'} shadow-clay-soft hover:shadow-clay-medium transition-all duration-200 relative`}>
        <CardContent className="p-3">
          <div className="flex items-start space-x-3">
            <div className={`p-1.5 rounded-full ${isUnread ? 'bg-burnt-peach/20' : 'bg-porcelain'}`}>
              <span className="text-lg">{alertTypeIcon}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-1">
                <h4 className={`text-sm font-medium ${isUnread ? 'text-burnt-peach' : 'text-foreground'} line-clamp-2`}>
                  {notification.title}
                </h4>
                {isRecent && (
                  <Badge variant="secondary" className="text-xs ml-2">
                    Novo
                  </Badge>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {notification.message}
              </p>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  {notification.propertyLocation && (
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-3 w-3 mr-1" />
                      {notification.propertyLocation}
                    </div>
                  )}
                  
                  {notification.propertyPrice && (
                    <div className="flex items-center text-muted-foreground">
                      <Euro className="h-3 w-3 mr-1" />
                      {notification.propertyPrice.toLocaleString()}
                    </div>
                  )}
                  
                  {priceChange && (
                    <span className={notification.alertType === 'price_drop' ? 'text-green-600' : 'text-red-600'}>
                      {priceChange}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center text-muted-foreground">
                  <Clock className="h-3 w-3 mr-1" />
                  {relativeTime}
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isUnread && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleMarkAsRead}
                  disabled={processing}
                  title="Marcar como lida"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={handleDelete}
                disabled={processing}
                title="Remover notificação"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
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
  const [notifications, setNotifications] = useState<PropertyAlertNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const notificationsList = await getRecentNotifications(limit);
      setNotifications(notificationsList);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      setNotifications([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications(false);
    setRefreshing(false);
    toast.success('Notificações atualizadas');
  };

  const handleMarkAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, readAt: new Date().toISOString() }
          : notif
      )
    );
  };

  const handleDelete = (notificationId: string) => {
    setNotifications(prev => 
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const handleMarkAllAsRead = async () => {
    try { 
      const result = await markAllNotificationsAsRead();
      setNotifications(prev => 
        prev.map(notif => ({ 
          ...notif, 
          readAt: notif.readAt || new Date().toISOString() 
        }))
      );
      toast.success(`${result.markedCount} notificações marcadas como lidas`);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
      toast.error('Erro ao marcar todas as notificações como lidas');
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [limit]);

  if (loading) {
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

  if (notifications.length === 0) {
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
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
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
              Você será notificado quando os seus alertas encontrarem novas propriedades
            </p>
            <Button onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Verificar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const unreadCount = notifications.filter(notif => !notif.readAt).length;

  return (
    <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-burnt-peach" />
            <CardTitle>Notificações de Alertas</CardTitle>
            {unreadCount > 0 && (
              <Badge className="bg-burnt-peach text-white">
                {unreadCount} nova{unreadCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Marcar todas
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {unreadCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {unreadCount} notificação{unreadCount > 1 ? 's' : ''} não lida{unreadCount > 1 ? 's' : ''}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-3">
            <AnimatePresence>
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}