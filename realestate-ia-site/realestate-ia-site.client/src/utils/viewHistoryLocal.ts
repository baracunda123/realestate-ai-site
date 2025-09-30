// utils/viewHistoryLocal.ts - Cache local dos dados do servidor
import { logger } from './logger';
import type { ViewHistoryItem } from '../types/PersonalArea';

const MAX_HISTORY_ITEMS = 10;
const STORAGE_KEY = 'property_view_history_cache';
const LAST_SYNC_KEY = 'property_view_history_last_sync';

const localLogger = {
  info: (message: string) => logger.info(message, 'VIEW_HISTORY_CACHE'),
  warn: (message: string) => logger.warn(message, 'VIEW_HISTORY_CACHE'),
  error: (message: string, error?: Error) => logger.error(message, 'VIEW_HISTORY_CACHE', error),
  debug: (message: string) => logger.debug(message, 'VIEW_HISTORY_CACHE')
};

/**
 * Cache local dos dados do servidor - SISTEMA HÍBRIDO
 * O servidor é a fonte da verdade, localStorage é apenas cache
 */
export const viewHistoryCache = {
  /**
   * Guardar dados do servidor no cache local
   */
  setCacheFromServer: (serverData: ViewHistoryItem[]): void => {
    try {
      const cacheData = {
        data: serverData,
        timestamp: new Date().toISOString(),
        count: serverData.length
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
      localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
      
      localLogger.debug(`Cache atualizado com ${serverData.length} itens do servidor`);
    } catch (error) {
      localLogger.warn('Erro ao guardar cache do servidor');
      localLogger.error('Detalhes do erro ao guardar cache', error as Error);
    }
  },

  /**
   * Obter dados do cache local
   */
  getCache: (): ViewHistoryItem[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const cacheData = JSON.parse(stored);
      return cacheData.data || [];
    } catch (error) {
      localLogger.warn('Erro ao ler cache local');
      localLogger.error('Detalhes do erro ao ler cache', error as Error);
      return [];
    }
  },

  /**
   * Adicionar visualização otimista ao cache (antes da resposta do servidor)
   */
  addOptimistic: (propertyId: string, propertyTitle: string): void => {
    try {
      const cached = viewHistoryCache.getCache();
      
      // Remove item existente se já estiver na lista
      const filtered = cached.filter(item => item.propertyId !== propertyId);
      
      // Adiciona novo item no início (otimista)
      const newItem: ViewHistoryItem = {
        id: 'temp-' + Date.now(), // ID temporário
        propertyId,
        propertyTitle,
        viewedAt: new Date().toISOString(),
        viewCount: 1 // Assumir 1 visualização temporariamente
      };
      
      const updatedCache = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      
      const cacheData = {
        data: updatedCache,
        timestamp: new Date().toISOString(),
        count: updatedCache.length
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
      localLogger.debug(`Adicionado otimisticamente: ${propertyTitle}`);
    } catch (error) {
      localLogger.warn('Erro ao adicionar ao cache otimista');
      localLogger.error('Detalhes do erro ao adicionar cache otimista', error as Error);
    }
  },

  /**
   * Verificar se o cache está desatualizado (> 5 minutos)
   */
  isCacheStale: (): boolean => {
    try {
      const lastSync = localStorage.getItem(LAST_SYNC_KEY);
      if (!lastSync) return true;
      
      const lastSyncTime = new Date(lastSync);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);
      
      return diffMinutes > 5; // Cache válido por 5 minutos
    } catch {
      return true; // Assumir desatualizado se erro
    }
  },

  /**
   * Limpar cache local
   */
  clearCache: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LAST_SYNC_KEY);
      localLogger.info('Cache local limpo');
    } catch (error) {
      localLogger.warn('Erro ao limpar cache');
      localLogger.error('Detalhes do erro ao limpar cache', error as Error);
    }
  },

  /**
   * Obter estatísticas do cache
   */
  getCacheStats: () => {
    try {
      const cached = viewHistoryCache.getCache();
      const lastSync = localStorage.getItem(LAST_SYNC_KEY);
      
      return {
        totalItems: cached.length,
        lastSync: lastSync ? new Date(lastSync) : null,
        isStale: viewHistoryCache.isCacheStale(),
        mostRecent: cached[0] || null
      };
    } catch {
      return {
        totalItems: 0,
        lastSync: null,
        isStale: true,
        mostRecent: null
      };
    }
  }
};

/**
 * Utils para formatação de dados do histórico
 */
export const viewHistoryLocalUtils = {
  /**
   * Verificar se uma propriedade foi visualizada recentemente (últimas 24h)
   */
  isRecentlyViewed: (viewedAt: Date | string): boolean => {
    const viewed = new Date(viewedAt);
    const now = new Date();
    const diffHours = (now.getTime() - viewed.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  },

  /**
   * Calcular tempo desde última visualização
   */
  getTimeSinceLastView: (viewedAt: Date | string): string => {
    const viewed = new Date(viewedAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - viewed.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return 'Agora mesmo';
    if (diffMinutes < 60) return `${diffMinutes}min atrás`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d atrás`;
    
    return viewed.toLocaleDateString('pt-PT');
  },

  /**
   * Formatar preço com formato português
   */
  formatPrice: (price: number): string => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  },

  /**
   * Agrupar visualizações por período
   */
  groupByPeriod: (viewHistory: ViewHistoryItem[]): {
    today: ViewHistoryItem[];
    yesterday: ViewHistoryItem[];
    thisWeek: ViewHistoryItem[];
    older: ViewHistoryItem[];
  } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    return {
      today: viewHistory.filter(item => new Date(item.viewedAt) >= today),
      yesterday: viewHistory.filter(item => {
        const viewDate = new Date(item.viewedAt);
        return viewDate >= yesterday && viewDate < today;
      }),
      thisWeek: viewHistory.filter(item => {
        const viewDate = new Date(item.viewedAt);
        return viewDate >= thisWeek && viewDate < yesterday;
      }),
      older: viewHistory.filter(item => new Date(item.viewedAt) < thisWeek)
    };
  }
};

// Log apenas quando carrega em desenvolvimento
if (import.meta.env.DEV) {
  localLogger.info('View History Cache Service carregado (Sistema Híbrido: Servidor + Cache)');
}