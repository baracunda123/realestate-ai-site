import React from 'react';
import { Card, CardContent} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Bell, Settings, Trash2, TrendingDown, MapPin, Euro, Clock } from 'lucide-react';
import type { User, PropertyAlert } from '../../types/PersonalArea';
import { EmptyState } from '../EmptyState';
import { formatDate } from '../../utils/PersonalArea';
import { priceAlertUtils } from '../../api/alerts.service';

interface PersonalAreaAlertsProps {
  user: User;
  alerts: PropertyAlert[];
  onDeleteAlert: (alertId: string) => void;
  onUpdateAlert?: (alertId: string, threshold: number) => void;
}

export function PersonalAreaAlerts({
  alerts,
  onDeleteAlert,
  onUpdateAlert
}: PersonalAreaAlertsProps) {

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="Nenhum alerta de preço ativo"
        description="Crie alertas de redução de preço clicando no sininho das propriedades que lhe interessam. Será notificado quando o preço baixar."
        actionLabel="Explorar Propriedades"
        onAction={() => window.location.href = '/'}
      />
    );
  }

  const handleThresholdChange = (alertId: string, newThreshold: number) => {
    if (onUpdateAlert) {
      onUpdateAlert(alertId, newThreshold);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-foreground flex items-center space-x-2">
            <Bell className="h-5 w-5 text-burnt-peach" />
            <span>Alertas de Redução de Preço</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {alerts.filter(alert => alert.isActive).length} alertas ativos • {alerts.reduce((sum, alert) => sum + alert.notificationCount, 0)} notificações enviadas
          </p>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid gap-4">
        {alerts.map((alert) => {
          const status = priceAlertUtils.getAlertStatus(alert);
          const hasRecentActivity = priceAlertUtils.hasRecentActivity(alert);
          
          return (
            <Card 
              key={alert.id} 
              className={`border shadow-clay-soft transition-all duration-200 ${
                alert.isActive 
                  ? 'border-pale-clay-deep bg-pure-white' 
                  : 'border-gray-200 bg-gray-50 opacity-75'
              } ${hasRecentActivity ? 'ring-1 ring-burnt-peach/20' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-8 h-8 bg-burnt-peach-lighter rounded-lg flex items-center justify-center border border-burnt-peach-light">
                        <TrendingDown className="h-4 w-4 text-burnt-peach-dark" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground line-clamp-1">{alert.propertyTitle}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant={alert.isActive ? "default" : "secondary"} className="text-xs">
                            {alert.isActive ? 'Ativo' : 'Pausado'}
                          </Badge>
                          {status === 'triggered' && (
                            <Badge className="bg-success-soft text-success-strong border-success-gentle text-xs">
                              {alert.notificationCount} notificação{alert.notificationCount !== 1 ? 'ões' : ''}
                            </Badge>
                          )}
                          {hasRecentActivity && (
                            <Badge className="bg-burnt-peach text-pure-white border-0 text-xs">
                              Atividade recente
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-burnt-peach" />
                          <span>{alert.propertyLocation}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Euro className="h-3 w-3 text-burnt-peach" />
                          <span className="font-medium text-foreground">€{alert.currentPrice.toLocaleString('pt-PT')}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <TrendingDown className="h-3 w-3 text-burnt-peach" />
                          <span>Alerta: redução de {alert.alertThresholdPercentage}% ou mais</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4 pt-2 border-t border-gray-100">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-xs">Criado em {formatDate(alert.createdAt)}</span>
                        </div>
                        {alert.lastTriggered && (
                          <div className="flex items-center space-x-1">
                            <Bell className="h-3 w-3 text-gray-400" />
                            <span className="text-xs">{priceAlertUtils.formatLastActivity(alert)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {/* Threshold adjustment */}
                    {onUpdateAlert && (
                      <div className="flex items-center space-x-1">
                        <select
                          value={alert.alertThresholdPercentage}
                          onChange={(e) => handleThresholdChange(alert.id, parseInt(e.target.value))}
                          className="text-xs border border-pale-clay-deep rounded px-2 py-1 bg-white text-gray-700 focus:border-burnt-peach focus:outline-none"
                        >
                          <option value={5}>5%</option>
                          <option value={10}>10%</option>
                          <option value={15}>15%</option>
                          <option value={20}>20%</option>
                          <option value={25}>25%</option>
                        </select>
                        <Settings className="h-3 w-3 text-gray-400" />
                      </div>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteAlert(alert.id)}
                      className="text-xs p-2 text-error-gentle hover:text-error-strong hover:bg-error-gentle/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="border border-burnt-peach-light bg-burnt-peach-lighter/5 shadow-clay-soft">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Bell className="h-5 w-5 text-burnt-peach mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-foreground">Como funcionam os alertas de preço</h4>
              <p className="text-xs text-muted-foreground">
                Clique no sininho (🔔) em qualquer propriedade para criar um alerta. Será notificado por email quando o preço baixar 
                conforme a percentagem definida. Pode ajustar a sensibilidade do alerta a qualquer momento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}