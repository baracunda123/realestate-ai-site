import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Bell, Plus, ToggleLeft, ToggleRight, Trash2, Eye } from 'lucide-react';
import type { User, PropertyAlert } from '../../types/PersonalArea';
import { EmptyState } from '../EmptyState';
import { formatDate, formatPrice, getPropertyTypeLabel } from '../../utils/PersonalArea';

interface PersonalAreaAlertsProps {
  user: User;
  alerts: PropertyAlert[];
  onCreateAlert: () => void;
  onDeleteAlert: (alertId: string) => void;
  onToggleAlert: (alertId: string) => void;
  onNavigateToAlertResults?: (alert: PropertyAlert) => void;
}

export function PersonalAreaAlerts({
  user,
  alerts,
  onCreateAlert,
  onDeleteAlert,
  onToggleAlert,
  onNavigateToAlertResults 
}: PersonalAreaAlertsProps) {

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="Nenhum alerta criado"
        description="Crie alertas personalizados e seja notificado sobre propriedades que correspondem aos seus critérios."
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
          <h2 className="font-medium text-foreground">Seus Alertas</h2>
          <p className="text-sm text-muted-foreground">
            {alerts.filter(alert => alert.isActive).length} alertas ativos
          </p>
        </div>
        <Button onClick={onCreateAlert} className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white">
          <Plus className="h-4 w-4 mr-2" />
          Novo Alerta
        </Button>
      </div>

      {/* Alerts Grid */}
      <div className="grid gap-4">
        {alerts.map((alert) => (
          <Card 
            key={alert.id} 
            className={`border shadow-clay-soft transition-all duration-200 ${
              alert.isActive 
                ? 'border-pale-clay-deep bg-pure-white' 
                : 'border-gray-200 bg-gray-50 opacity-75'
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-medium text-foreground">{alert.name}</h3>
                    <Badge variant={alert.isActive ? "default" : "secondary"}>
                      {alert.isActive ? 'Ativo' : 'Pausado'}
                    </Badge>
                    {alert.newMatches > 0 && (
                      <Badge className="bg-success-soft text-success-strong border-success-gentle">
                        {alert.newMatches} novos
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex flex-wrap gap-4">
                      {alert.location && (
                        <span>📍 {alert.location}</span>
                      )}
                      {alert.propertyType && alert.propertyType !== 'any' && (
                        <span>🏠 {getPropertyTypeLabel(alert.propertyType)}</span>
                      )}
                      {alert.bedrooms && (
                        <span>🛏️ {alert.bedrooms}+ quartos</span>
                      )}
                      {alert.bathrooms && (
                        <span>🚿 {alert.bathrooms}+ casas de banho</span>
                      )}
                      {(alert.minPrice || alert.maxPrice) && (
                        <span>💰 {formatPrice(alert.minPrice || 0)} - {alert.maxPrice ? formatPrice(alert.maxPrice) : 'Sem limite'}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 pt-2">
                      <span className="text-xs">
                        Criado em {formatDate(alert.createdAt)}
                      </span>
                      <span className="text-xs">
                        {alert.matchCount} propriedades encontradas
                      </span>
                      {alert.lastTriggered && (
                        <span className="text-xs">
                          Último resultado: {formatDate(alert.lastTriggered)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {alert.matchCount > 0 && onNavigateToAlertResults && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onNavigateToAlertResults(alert)}
                      className="text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver Resultados
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onToggleAlert(alert.id)}
                    className="text-xs p-2"
                  >
                    {alert.isActive ? (
                      <ToggleRight className="h-4 w-4 text-success-gentle" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteAlert(alert.id)}
                    className="text-xs p-2 text-error-gentle hover:text-error-strong"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}