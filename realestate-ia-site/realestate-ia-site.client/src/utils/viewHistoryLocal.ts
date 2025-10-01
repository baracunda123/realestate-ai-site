// utils/viewHistoryLocal.ts - Cache simples para histórico de visualizações
import { logger } from './logger';
import type { ViewHistoryItem } from '../types/PersonalArea';
import type { Property } from '../types/property';

const STORAGE_KEY = 'property_view_history_cache';
const LAST_SYNC_KEY = 'property_view_history_last_sync';

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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      localLogger.info(`Item ${historyId} removido do cache`);
    } catch (error) {
      localLogger.error('Erro ao remover item do cache', error as Error);
    }
  }
};

if (import.meta.env.DEV) {
  localLogger.info('View History Cache simplificado carregado');
}