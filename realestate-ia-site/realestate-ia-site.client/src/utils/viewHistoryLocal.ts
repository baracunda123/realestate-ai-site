// utils/viewHistoryLocal.ts - Cache simples para histórico de visualizações
import { logger } from './logger';
import type { ViewHistoryItem } from '../types/PersonalArea';
import type { Property } from '../types/property';

const STORAGE_KEY = 'property_view_history_cache';
const LAST_SYNC_KEY = 'property_view_history_last_sync';
const HIDDEN_PROPERTIES_KEY = 'hidden_properties_cache';

const localLogger = {
  info: (message: string) => logger.info(message, 'VIEW_HISTORY_CACHE'),
  warn: (message: string) => logger.warn(message, 'VIEW_HISTORY_CACHE'),
  error: (message: string, error?: Error) => logger.error(message, 'VIEW_HISTORY_CACHE', error)
};

/**
 * Cache simples para dados do servidor
 */
export const viewHistoryCache = {
  /**
   * Guardar dados do servidor no cache
   */
  setCacheFromServer: (serverData: ViewHistoryItem[]): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      localLogger.info(`Cache atualizado com ${serverData.length} itens`);
    } catch (error) {
      localLogger.error('Erro ao guardar cache', error as Error);
    }
  },

  /**
   * Obter dados do cache
   */
  getCache: (): ViewHistoryItem[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      localLogger.error('Erro ao ler cache', error as Error);
      return [];
    }
  },

  /**
   * Adicionar visualização otimista (antes da resposta do servidor)
   */
  addOptimistic: (property: Property): void => {
    try {
      const cached = viewHistoryCache.getCache();
      
      // Remove se já existe
      const filtered = cached.filter(item => item.property.id !== property.id);
      
      // Se a propriedade estava hidden, removê-la do cache de hidden
      viewHistoryCache.removeFromHiddenCache(property.id);
      
      // Adiciona novo no início com propriedade completa
      const newItem: ViewHistoryItem = {
        id: 'temp-' + Date.now(),
        viewedAt: new Date().toISOString(),
        property: property
      };
      
      const updatedCache = [newItem, ...filtered].slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCache));
      
      localLogger.info(`Adicionado otimisticamente: ${property.title}`);
    } catch (error) {
      localLogger.error('Erro ao adicionar cache otimista', error as Error);
    }
  },

  /**
   * Verificar se cache está desatualizado (> 5 minutos)
   */
  isCacheStale: (): boolean => {
    try {
      const lastSync = localStorage.getItem(LAST_SYNC_KEY);
      if (!lastSync) return true;
      
      const lastSyncTime = new Date(lastSync);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);
      
      return diffMinutes > 5;
    } catch {
      return true;
    }
  },

  /**
   * Limpar cache
   */
  clearCache: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAST_SYNC_KEY);
      localStorage.removeItem(HIDDEN_PROPERTIES_KEY);
      localLogger.info('Cache limpo');
    } catch (error) {
      localLogger.error('Erro ao limpar cache', error as Error);
    }
  },

  /**
   * Remover item específico do cache
   */
  removeFromCache: (historyId: string): void => {
    try {
      const cached = viewHistoryCache.getCache();
      const filtered = cached.filter(item => item.id !== historyId);
      
      // Encontrar a propriedade removida para adicionar ao cache de hidden
      const removedItem = cached.find(item => item.id === historyId);
      if (removedItem) {
        viewHistoryCache.addToHiddenCache(removedItem.property.id);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      localLogger.info(`Item ${historyId} removido do cache`);
    } catch (error) {
      localLogger.error('Erro ao remover item do cache', error as Error);
    }
  },

  /**
   * Adicionar propriedade ao cache de hidden
   */
  addToHiddenCache: (propertyId: string): void => {
    try {
      const hiddenProperties = viewHistoryCache.getHiddenCache();
      if (!hiddenProperties.includes(propertyId)) {
        hiddenProperties.push(propertyId);
        localStorage.setItem(HIDDEN_PROPERTIES_KEY, JSON.stringify(hiddenProperties));
        localLogger.info(`Propriedade ${propertyId} marcada como hidden no cache`);
      }
    } catch (error) {
      localLogger.error('Erro ao adicionar ao cache de hidden', error as Error);
    }
  },

  /**
   * Remover propriedade do cache de hidden
   */
  removeFromHiddenCache: (propertyId: string): void => {
    try {
      const hiddenProperties = viewHistoryCache.getHiddenCache();
      const filtered = hiddenProperties.filter(id => id !== propertyId);
      localStorage.setItem(HIDDEN_PROPERTIES_KEY, JSON.stringify(filtered));
      localLogger.info(`Propriedade ${propertyId} removida do cache de hidden`);
    } catch (error) {
      localLogger.error('Erro ao remover do cache de hidden', error as Error);
    }
  },

  /**
   * Obter cache de propriedades hidden
   */
  getHiddenCache: (): string[] => {
    try {
      const stored = localStorage.getItem(HIDDEN_PROPERTIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      localLogger.error('Erro ao ler cache de hidden', error as Error);
      return [];
    }
  },

  /**
   * Verificar se uma propriedade estava hidden
   */
  wasPropertyHidden: (propertyId: string): boolean => {
    try {
      const hiddenProperties = viewHistoryCache.getHiddenCache();
      return hiddenProperties.includes(propertyId);
    } catch (error) {
      localLogger.error('Erro ao verificar se propriedade estava hidden', error as Error);
      return false;
    }
  }
};

if (import.meta.env.DEV) {
  localLogger.info('View History Cache simplificado carregado');
}