import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Bell, Crown, Plus, Edit, Trash2, Mail, Smartphone, Building2, Bed, Bath, ArrowRight } from 'lucide-react';
import { type PropertyAlert, type User } from '../../types/PersonalArea';
import { EmptyState } from '../EmptyState';
import { getCurrentLimits, formatDate, formatPrice, getPropertyTypeLabel } from '../../utils/PersonalArea';

interface PersonalAreaAlertsProps {
  user: User;
  alerts: PropertyAlert[];
  onCreateAlert: () => void;
  onEditAlert: (alertId: string) => void;
  onDeleteAlert: (alertId: string) => void;
  onToggleAlert: (alertId: string) => void;
  onOpenUpgradeModal?: () => void;
  onNavigateToAlertResults?: (alert: PropertyAlert) => void;
}

export function PersonalAreaAlerts({ 
  user, 
  alerts, 
  onCreateAlert, 
  onEditAlert, 
  onDeleteAlert, 
  onToggleAlert,
  onOpenUpgradeModal,
  onNavigateToAlertResults 
}: PersonalAreaAlertsProps) {
  const currentLimits = getCurrentLimits(user);

  if (!user.isPremium) {
    return (
      <Card className="border border-burnt-peach-light bg-burnt-peach-lighter/10 shadow-clay-soft">
        <CardContent className="p-8 text-center">
          <Bell className="h-16 w-16 text-burnt-peach mx-auto mb-6" />
          <h2 className="text-xl font-medium text-foreground mb-4">Alertas Premium</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Receba notificações personalizadas sobre novas propriedades, mudanças de preço e 
            oportunidades que correspondem aos seus critérios específicos.
          </p>
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>Alertas por email</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <Smartphone className="h-4 w-4" />
              <span>Notificações SMS</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              <span>Alertas de mudança de preço</span>
            </div>
          </div>
          <Button 
            className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white"
            onClick={onOpenUpgradeModal}
          >
            <Crown className="h-4 w-4 mr-2" />
            Fazer Upgrade para Premium
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="Nenhum alerta configurado"
        description="Configure alertas personalizados para ser notificado sobre novas propriedades ou mudanças de preço que interessam você!"
        actionLabel="Criar Primeiro Alerta"
        onAction={onCreateAlert}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-foreground">Seus Alertas de Propriedades</h2>
          <p className="text-sm text-muted-foreground">
            {alerts.length} alertas configurados • {alerts.filter(a => a.isActive).length} ativos
          </p>
        </div>

        <Button 
          className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white"
          onClick={onCreateAlert}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Alerta
        </Button>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.map((alert) => (
          <Card key={alert.id} className="border border-pale-clay-deep bg-pure-white shadow-clay-soft">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-burnt-peach-lighter rounded-lg flex items-center justify-center border border-pale-clay-deep">
                      <Bell className="h-5 w-5 text-burnt-peach-dark" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-foreground">{alert.name}</h3>
                        <Switch
                          checked={alert.isActive}
                          onCheckedChange={() => onToggleAlert(alert.id)}
                          className="scale-75"
                        />
                        <Badge className={alert.isActive ? 'bg-success-gentle text-pure-white border-0' : 'bg-pale-clay-deep text-warm-taupe border-0'}>
                          {alert.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Criado em {formatDate(alert.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="ml-13 space-y-3">
                    {/* Criteria */}
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-pale-clay-light text-cocoa-taupe border-0">
                        📍 {alert.location}
                      </Badge>
                      <Badge className="bg-pale-clay-light text-cocoa-taupe border-0">
                        <Building2 className="h-3 w-3 mr-1" />
                        {getPropertyTypeLabel(alert.propertyType)}
                      </Badge>
                      {alert.bedrooms && (
                        <Badge className="bg-pale-clay-light text-cocoa-taupe border-0">
                          <Bed className="h-3 w-3 mr-1" />
                          {alert.bedrooms}+ quartos
                        </Badge>
                      )}
                      {alert.bathrooms && (
                        <Badge className="bg-pale-clay-light text-cocoa-taupe border-0">
                          <Bath className="h-3 w-3 mr-1" />
                          {alert.bathrooms}+ banheiros
                        </Badge>
                      )}
                      <Badge className="bg-pale-clay-light text-cocoa-taupe border-0">
                        💰 {formatPrice(alert.priceRange[0])} - {formatPrice(alert.priceRange[1])}
                      </Badge>
                    </div>
                    
                    {/* Notifications */}
                    <div className="flex flex-wrap gap-2">
                      {alert.notifications.email && (
                        <Badge className="bg-info-soft text-info-strong border-0">
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Badge>
                      )}
                      {alert.notifications.sms && (
                        <Badge className="bg-info-soft text-info-strong border-0">
                          <Smartphone className="h-3 w-3 mr-1" />
                          SMS
                        </Badge>
                      )}
                      {alert.notifications.priceDrops && (
                        <Badge className="bg-warning-soft text-warning-strong border-0">
                          📉 Quedas de preço
                        </Badge>
                      )}
                      {alert.notifications.newListings && (
                        <Badge className="bg-success-soft text-success-strong border-0">
                          ✨ Novos anúncios
                        </Badge>
                      )}
                    </div>
                    
                    {/* Stats */}
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-muted-foreground">
                        {alert.matchCount} propriedades encontradas
                      </span>
                      {alert.newMatches > 0 && (
                        <Badge 
                          className="bg-burnt-peach text-pure-white border-0 cursor-pointer hover:bg-burnt-peach-deep transition-all duration-200 hover:shadow-clay-medium flex items-center space-x-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onNavigateToAlertResults) {
                              onNavigateToAlertResults(alert);
                            }
                          }}
                          title="Clique para ver as propriedades encontradas"
                        >
                          <span>{alert.newMatches} novas</span>
                          <ArrowRight className="h-3 w-3" />
                        </Badge>
                      )}
                      {alert.lastTriggered && (
                        <span className="text-muted-foreground">
                          Último disparo: {formatDate(alert.lastTriggered)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-pale-clay-deep hover:bg-pale-clay-light"
                    onClick={() => onEditAlert(alert.id)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-error-gentle hover:bg-error-soft text-error-strong"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Alerta</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja excluir o alerta "{alert.name}"? 
                          Você não receberá mais notificações sobre estes critérios.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-error-gentle hover:bg-error-strong"
                          onClick={() => onDeleteAlert(alert.id)}
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}