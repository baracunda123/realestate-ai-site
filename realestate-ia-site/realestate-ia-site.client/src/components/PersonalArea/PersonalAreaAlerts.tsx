import { Card, CardContent} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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
              className={`saved-search-card border shadow-clay-soft transition-all duration-200 group ${
                alert.isActive 
                  ? 'border-pale-clay-deep bg-pure-white' 
                  : 'border-gray-200 bg-gray-50 opacity-75'
              } ${hasRecentActivity ? 'ring-2 ring-burnt-peach/20' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="search-icon w-10 h-10 bg-burnt-peach-lighter rounded-lg flex items-center justify-center border border-burnt-peach-light">
                        <TrendingDown className="icon h-5 w-5 text-burnt-peach-dark" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-title line-clamp-1">{alert.propertyTitle}</h3>
                          <Badge variant={alert.isActive ? "default" : "secondary"} className="text-xs shadow-clay-soft">
                            {alert.isActive ? 'Ativo' : 'Pausado'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          {status === 'triggered' && (
                            <Badge className="search-badge bg-success-soft text-success-strong border-success-gentle text-xs">
                              {alert.notificationCount} notificação{alert.notificationCount !== 1 ? 'ões' : ''}
                            </Badge>
                          )}
                          {hasRecentActivity && (
                            <Badge className="search-badge bg-burnt-peach text-pure-white border-0 text-xs shadow-burnt-peach">
                              Atividade recente
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center bg-pale-clay-light px-3 py-1.5 rounded-full">
                          <MapPin className="h-3 w-3 text-burnt-peach mr-2" />
                          <span className="text-clay-secondary">{alert.propertyLocation}</span>
                        </div>
                        <div className="flex items-center bg-pale-clay-light px-3 py-1.5 rounded-full">
                          <Euro className="h-3 w-3 text-burnt-peach mr-2" />
                          <span className="font-medium text-title">€{alert.currentPrice.toLocaleString('pt-PT')}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center bg-burnt-peach-lighter/30 px-3 py-1.5 rounded-full">
                        <TrendingDown className="h-3 w-3 text-burnt-peach mr-2" />
                        <span className="text-burnt-peach-dark">Alerta: redução de {alert.alertThresholdPercentage}% ou mais</span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-whisper-clay">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center text-clay-secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            <span className="text-xs">Criado em {formatDate(alert.createdAt)}</span>
                          </div>
                          {alert.lastTriggered && (
                            <div className="flex items-center text-clay-secondary">
                              <Bell className="h-3 w-3 mr-1" />
                              <span className="text-xs">{priceAlertUtils.formatLastActivity(alert)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {/* Threshold adjustment */}
                    {onUpdateAlert && (
                      <div className="flex items-center space-x-2">
                        <Select
                          value={alert.alertThresholdPercentage.toString()}
                          onValueChange={(value) => handleThresholdChange(alert.id, parseInt(value))}
                        >
                          <SelectTrigger className="w-20 h-8 text-xs border-pale-clay-deep bg-pure-white hover:border-burnt-peach focus:border-burnt-peach focus:ring-2 focus:ring-burnt-peach/20 transition-all duration-200">
                            <SelectValue className="text-warm-taupe font-medium" />
                          </SelectTrigger>
                          <SelectContent className="bg-pure-white border-pale-clay-deep shadow-clay-medium">
                            <SelectItem 
                              value="5" 
                              className="text-xs text-warm-taupe hover:bg-burnt-peach-lighter/20 hover:text-burnt-peach-dark focus:bg-burnt-peach-lighter/30 focus:text-burnt-peach-dark cursor-pointer"
                            >
                              5%
                            </SelectItem>
                            <SelectItem 
                              value="10" 
                              className="text-xs text-warm-taupe hover:bg-burnt-peach-lighter/20 hover:text-burnt-peach-dark focus:bg-burnt-peach-lighter/30 focus:text-burnt-peach-dark cursor-pointer"
                            >
                              10%
                            </SelectItem>
                            <SelectItem 
                              value="15" 
                              className="text-xs text-warm-taupe hover:bg-burnt-peach-lighter/20 hover:text-burnt-peach-dark focus:bg-burnt-peach-lighter/30 focus:text-burnt-peach-dark cursor-pointer"
                            >
                              15%
                            </SelectItem>
                            <SelectItem 
                              value="20" 
                              className="text-xs text-warm-taupe hover:bg-burnt-peach-lighter/20 hover:text-burnt-peach-dark focus:bg-burnt-peach-lighter/30 focus:text-burnt-peach-dark cursor-pointer"
                            >
                              20%
                            </SelectItem>
                            <SelectItem 
                              value="25" 
                              className="text-xs text-warm-taupe hover:bg-burnt-peach-lighter/20 hover:text-burnt-peach-dark focus:bg-burnt-peach-lighter/30 focus:text-burnt-peach-dark cursor-pointer"
                            >
                              25%
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Settings className="h-4 w-4 text-cocoa-taupe hover:text-burnt-peach transition-colors duration-200 hover:scale-110" />
                      </div>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteAlert(alert.id)}
                      className="search-delete-btn text-xs p-2 text-error-gentle hover:text-pure-white"
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
      <Card className="dashboard-section-card border border-burnt-peach-light bg-burnt-peach-lighter/5 shadow-clay-soft">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 bg-burnt-peach-lighter rounded-lg flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5 text-burnt-peach" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-title">Como funcionam os alertas de preço</h4>
              <p className="text-xs text-warm-taupe leading-relaxed">
                Clique no sininho em qualquer propriedade para criar um alerta. Será notificado quando o preço baixar 
                conforme a percentagem definida. Pode ajustar a sensibilidade do alerta a qualquer momento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}