// view-history.service.ts - Serviço híbrido: Servidor + Cache Local
import apiClient from "./client";
import type { ViewHistoryItem } from "../types/PersonalArea";
import type { Property } from "../types/property";
import { logger } from '../utils/logger';
import { viewHistoryCache } from '../utils/viewHistoryLocal';

// Response types específicos para histórico de visualizações - SIMPLIFICADO
interface ViewHistoryResponse {
  viewHistory: ViewHistoryItem[];
  totalCount: number;
  totalViews: number;
}

interface TrackViewRequest {
  propertyId: string;
}

interface TrackViewResponse {
  success: boolean;
  message: string;
  viewCount: number;
}

// Logger específico para view history
const viewHistoryLogger = {
  info: (message: string) => logger.info(message, 'VIEW_HISTORY'),
  warn: (message: string) => logger.warn(message, 'VIEW_HISTORY'),
  error: (message: string, error?: Error) => logger.error(message, 'VIEW_HISTORY', error),
  debug: (message: string) => logger.debug(message, 'VIEW_HISTORY')
}

/**
 * Obter histórico de visualizações - HÍBRIDO (Cache + Servidor)
 */
export async function getViewHistory(limit?: number, forceRefresh = false): Promise<ViewHistoryResponse> {
  viewHistoryLogger.info('Buscando histórico de visualizações (híbrido)');

  // Se não forçar refresh e cache não está desatualizado, usar cache
  if (!forceRefresh && !viewHistoryCache.isCacheStale()) {
    const cachedData = viewHistoryCache.getCache();
    if (cachedData.length > 0) {
      viewHistoryLogger.info(`Usando cache local: ${cachedData.length} itens`);
      return {
        viewHistory: cachedData,
        totalCount: cachedData.length,
        totalViews: cachedData.reduce((sum, item) => sum + item.viewCount, 0)
      };
    }
  }

  // Buscar do servidor
  try {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get<ViewHistoryResponse>(
      `/api/view-history${params.toString() ? `?${params.toString()}` : ''}`
    );
    
    // Atualizar cache com dados do servidor
    viewHistoryCache.setCacheFromServer(response.viewHistory);
    
    viewHistoryLogger.info(`${response.viewHistory?.length || 0} visualizações encontradas do servidor`);
    return response;
  } catch (error) {
    const err = error as Error;
    viewHistoryLogger.error('Erro ao buscar do servidor, usando cache', err);
    
    // Fallback para cache se servidor falhar
    const cachedData = viewHistoryCache.getCache();
    return {
      viewHistory: cachedData,
      totalCount: cachedData.length,
      totalViews: cachedData.reduce((sum, item) => sum + item.viewCount, 0)
    };
  }
}

/**
 * Registrar visualização - HÍBRIDO (Cache Otimista + Servidor)
 */
export async function trackPropertyView(property: Property): Promise<TrackViewResponse> {
  viewHistoryLogger.info(`Registrando visualização: ${property.id}`);

  // 1. CACHE OTIMISTA - Resposta imediata
  viewHistoryCache.addOptimistic(property.id, property.title || 'Propriedade');

  // 2. SERVIDOR - Sync em background
  try {
    const trackData: TrackViewRequest = {
      propertyId: property.id
    };

    const response = await apiClient.post<TrackViewResponse>('/api/view-history/track', trackData);
    
    // 3. SYNC CACHE - Buscar dados atualizados do servidor
    getViewHistory(10, true).catch(() => 
      viewHistoryLogger.warn('Falha ao sincronizar cache')
    );
    
    viewHistoryLogger.info(`Visualização registrada. Total: ${response.viewCount}`);
    return response;
  } catch (error) {
    const err = error as Error;
    viewHistoryLogger.error('Erro ao registrar no servidor (cache otimista mantido)', err);
    
    // Retornar sucesso mesmo com erro de servidor (cache otimista funcionou)
    return {
      success: false,
      message: 'Registrado localmente, sync pendente',
      viewCount: 1
    };
  }
}

/**
 * Obter detalhes de uma visualização específica
 */
export async function getViewHistoryItem(historyId: string): Promise<ViewHistoryItem> {
  viewHistoryLogger.info(`Buscando detalhes da visualização: ${historyId}`);

  try {
    const item = await apiClient.get<ViewHistoryItem>(`/api/view-history/${historyId}`);
    
    viewHistoryLogger.info(`Detalhes encontrados: ${item.propertyTitle}`);
    return item;
  } catch (error) {
    const err = error as Error;
    viewHistoryLogger.error(`Erro ao buscar detalhes ${historyId}`, err);
    throw error;
  }
}

/**
 * Remover item do histórico
 */
export async function removeFromViewHistory(historyId: string): Promise<{ success: boolean; message: string }> {
  viewHistoryLogger.info(`Removendo item: ${historyId}`);

  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/view-history/${historyId}`
    );
    
    // Atualizar cache após remoção
    getViewHistory(10, true).catch(() => 
      viewHistoryLogger.warn('Falha ao sincronizar cache após remoção')
    );
    
    viewHistoryLogger.info('Item removido com sucesso');
    return response;
  } catch (error) {
    const err = error as Error;
    viewHistoryLogger.error(`Erro ao remover item ${historyId}`, err);
    throw error;
  }
}

/**
 * Limpar todo o histórico
 */
export async function clearViewHistory(): Promise<{ success: boolean; message: string }> {
  viewHistoryLogger.info('Limpando histórico completo');

  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      '/api/view-history/clear'
    );
    
    // Limpar cache também
    viewHistoryCache.clearCache();
    
    viewHistoryLogger.info('Histórico limpo com sucesso');
    return response;
  } catch (error) {
    const err = error as Error;
    viewHistoryLogger.error('Erro ao limpar histórico', err);
    throw error;
  }
}

/**
 * Obter estatísticas do histórico
 */
export async function getViewHistoryStats(): Promise<{
  totalViews: number;
  uniqueProperties: number;
  mostViewedProperty?: {
    propertyId: string;
    propertyTitle: string;
    viewCount: number;
  };
  recentActivity: Array<{
    propertyId: string;
    propertyTitle: string;
    viewedAt: string;
    viewCount: number;
  }>;
}> {
  viewHistoryLogger.info('Buscando estatísticas');

  try {
    const stats = await apiClient.get<{
      totalViews: number;
      uniqueProperties: number;
      mostViewedProperty?: {
        propertyId: string;
        propertyTitle: string;
        viewCount: number;
      };
      recentActivity: Array<{
        propertyId: string;
        propertyTitle: string;
        viewedAt: string;
        viewCount: number;
      }>;
    }>('/api/view-history/stats');
    
    viewHistoryLogger.info(`Estatísticas: ${stats.totalViews} visualizações`);
    return stats;
  } catch (error) {
    const err = error as Error;
    viewHistoryLogger.error('Erro ao buscar estatísticas', err);
    throw error;
  }
}

/**
 * Marcar como "vista novamente"
 */
export async function markAsViewedAgain(propertyId: string): Promise<TrackViewResponse> {
  viewHistoryLogger.info(`Marcando como vista novamente: ${propertyId}`);

  try {
    const response = await apiClient.post<TrackViewResponse>(
      `/api/view-history/${propertyId}/view-again`
    );
    
    // Atualizar cache
    getViewHistory(10, true).catch(() => 
      viewHistoryLogger.warn('Falha ao sincronizar cache')
    );
    
    viewHistoryLogger.info(`Marcado como visto novamente. Total: ${response.viewCount}`);
    return response;
  } catch (error) {
    const err = error as Error;
    viewHistoryLogger.error(`Erro ao marcar ${propertyId}`, err);
    throw error;
  }
}

// Utils para histórico de visualizações - SIMPLIFICADO
export const viewHistoryUtils = {
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
   * Classificar propriedade por interesse baseado no número de visualizações
   */
  getInterestLevel: (viewCount: number): 'baixo' | 'médio' | 'alto' => {
    if (viewCount >= 5) return 'alto';
    if (viewCount >= 3) return 'médio';
    return 'baixo';
  },

  /**
   * Obter cor do badge baseado no interesse
   */
  getInterestColor: (viewCount: number): string => {
    const level = viewHistoryUtils.getInterestLevel(viewCount);
    switch (level) {
      case 'alto': return 'bg-green-100 text-green-700 border-green-200';
      case 'médio': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
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
  viewHistoryLogger.info('View History Service Híbrido carregado (Servidor + Cache)');
}