import React from 'react';
import type { PropertyAlertNotification, AlertType } from '../types/PersonalArea';
import { AlertTypeUtils } from '../types/PersonalArea';

interface NotificationItemProps {
  notification: PropertyAlertNotification;
  onMarkAsRead?: (id: string) => void;
  onPropertyClick?: (propertyId: string) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onMarkAsRead, 
  onPropertyClick 
}) => {
  const meta = AlertTypeUtils.getMeta(notification.alertType);
  const isRecent = AlertTypeUtils.isRecent(notification.createdAt);
  const relativeTime = AlertTypeUtils.formatRelativeTime(notification.createdAt);
  
  const handleClick = () => {
    if (!notification.readAt && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    if (onPropertyClick) {
      onPropertyClick(notification.propertyId);
    }
  };

  const formatNotificationContent = () => {
    if (AlertTypeUtils.isPriceRelated(notification.alertType) && notification.oldPrice && notification.propertyPrice) {
      const priceChange = AlertTypeUtils.formatPriceChange(notification.propertyPrice, notification.oldPrice);
      return (
        <div>
          <p className="text-sm text-gray-600">{notification.message}</p>
          <p className="text-sm font-medium text-green-600">{priceChange}</p>
        </div>
      );
    }
    
    return <p className="text-sm text-gray-600">{notification.message}</p>;
  };

  return (
    <div 
      className={`
        p-4 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50
        ${!notification.readAt ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}
        ${isRecent ? 'shadow-sm' : ''}
      `}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        {/* Ícone do tipo de alerta */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm
          ${meta.bgColor}
        `}>
          <span>{meta.icon}</span>
        </div>
        
        {/* Conteúdo da notificação */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={`
              text-sm font-medium text-gray-900 truncate
              ${!notification.readAt ? 'font-semibold' : ''}
            `}>
              {notification.title}
            </h4>
            <div className="flex items-center space-x-2">
              {isRecent && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Novo
                </span>
              )}
              <span className="text-xs text-gray-500">{relativeTime}</span>
            </div>
          </div>
          
          {/* Mensagem e informações específicas do tipo */}
          <div className="mt-1">
            {formatNotificationContent()}
          </div>
          
          {/* Informações da propriedade */}
          {notification.propertyLocation && (
            <div className="mt-2 flex items-center text-xs text-gray-500">
              <span className="mr-1">??</span>
              <span>{notification.propertyLocation}</span>
              {notification.propertyPrice && (
                <>
                  <span className="mx-2">•</span>
                  <span>€{notification.propertyPrice.toLocaleString()}</span>
                </>
              )}
              {notification.bedrooms && (
                <>
                  <span className="mx-2">•</span>
                  <span>{notification.bedrooms} quartos</span>
                </>
              )}
            </div>
          )}
        </div>
        
        {/* Indicador de não lida */}
        {!notification.readAt && (
          <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></div>
        )}
      </div>
    </div>
  );
};

interface NotificationListProps {
  notifications: PropertyAlertNotification[];
  onMarkAsRead?: (id: string) => void;
  onPropertyClick?: (propertyId: string) => void;
  onMarkAllAsRead?: () => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  onMarkAsRead,
  onPropertyClick,
  onMarkAllAsRead
}) => {
  const unreadCount = notifications.filter(n => !n.readAt).length;
  
  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-4xl mb-2">??</div>
        <p className="text-gray-500">Não há notificações</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header com contador e ação de marcar todas como lidas */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Notificações
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
            </span>
          )}
        </h3>
        {unreadCount > 0 && onMarkAllAsRead && (
          <button
            onClick={onMarkAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>
      
      {/* Lista de notificações */}
      <div className="divide-y divide-gray-100">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onMarkAsRead={onMarkAsRead}
            onPropertyClick={onPropertyClick}
          />
        ))}
      </div>
    </div>
  );
};

// Componente de exemplo de como usar com filtros por tipo
interface NotificationFilterProps {
  selectedTypes: AlertType[];
  onTypeToggle: (type: AlertType) => void;
}

export const NotificationFilter: React.FC<NotificationFilterProps> = ({
  selectedTypes,
  onTypeToggle
}) => {
  const allTypes: AlertType[] = ['new_listing', 'price_drop', 'back_to_market', 'status_change'];
  
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {allTypes.map((type) => {
        const meta = AlertTypeUtils.getMeta(type);
        const isSelected = selectedTypes.includes(type);
        
        return (
          <button
            key={type}
            onClick={() => onTypeToggle(type)}
            className={`
              inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors
              ${isSelected 
                ? `${meta.bgColor} ${meta.color} border-2 border-current` 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <span className="mr-1">{meta.icon}</span>
            {meta.title}
          </button>
        );
      })}
    </div>
  );
};