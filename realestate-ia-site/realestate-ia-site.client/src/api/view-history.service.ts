// view-history.service.ts - Serviço simplificado para histórico de visualizações
import apiClient from "./client";
import type { ViewHistoryItem } from "../types/PersonalArea";
import type { Property } from "../types/property";
import { logger } from '../utils/logger';
import { viewHistoryCache } from '../utils/viewHistoryLocal';

// Response types específicos para histórico de visualizações
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
 * Obter histórico de visualizações
 */
export async function getViewHistory(limit?: number, forceRefresh = false): Promise<ViewHistoryResponse> {
  viewHistoryLogger.info('Buscando histórico de visualizações');

  // Se n�o for�ar refresh e cache n�o est� desatualizado, usar cache
  if (!forceRefresh && !viewHistoryCache.isCacheStale()) {
    const cachedData = viewHistoryCache.getCache();
    if (cachedData.length > 0) {
      viewHistoryLogger.info(`Usando cache local: ${cachedData.length} itens`);
      return {
        viewHistory: cachedData,
        totalCount: cachedData.length,
        totalViews: 0 // Não calculamos mais totalViews no frontend
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
      totalViews: 0
    };
  }
}

/**
 * Registrar visualização de propriedade
 */
export async function trackPropertyView(property: Property): Promise<TrackViewResponse> {
  viewHistoryLogger.info(`Registrando visualização: ${property.id}`);

  // Verificar se a propriedade estava hidden antes de processar
  const wasHidden = viewHistoryCache.wasPropertyHidden(property.id);
  if (wasHidden) {
    viewHistoryLogger.info(`Propriedade ${property.id} estava hidden, será reativada`);
  }

  // 1. CACHE OTIMISTA - Resposta imediata com propriedade completa
  viewHistoryCache.addOptimistic(property);

  // 2. SERVIDOR - Sync em background
  try {
    const trackData: TrackViewRequest = {
      propertyId: property.id
    };

    const response = await apiClient.post<TrackViewResponse>('/api/view-history/track', trackData);
    
    // 3. SYNC CACHE IMEDIATO - Forçar refresh para garantir dados atualizados
    await getViewHistory(10, true);
    
    if (wasHidden) {
      viewHistoryLogger.info(`Propriedade ${property.id} reativada com sucesso. Total: ${response.viewCount}`);
    } else {
      viewHistoryLogger.info(`Visualização registrada. Total: ${response.viewCount}`);
    }
    
    return response;
  } catch (error) {
    const err = error as Error;
    viewHistoryLogger.error('Erro ao registrar no servidor (cache otimista mantido)', err);
    
    // Retornar sucesso mesmo com erro de servidor (cache otimista funcionou)
    return {
      success: false,
      message: wasHidden ? 'Propriedade reativada localmente, sync pendente' : 'Registrado localmente, sync pendente',
      viewCount: 1
    };
  }
}

/**
 * Ocultar item do histórico (soft delete - marca como oculto na BD)
 */
export async function removeFromViewHistory(historyId: string): Promise<{ success: boolean; message: string }> {
  viewHistoryLogger.info(`Ocultando item do histórico: ${historyId}`);

  try {
    // Chamar API para marcar como oculto
    const response = await apiClient.patch<{ success: boolean; message: string }>(`/api/view-history/${historyId}/remove`);
    
    // Remover também do cache local para resposta imediata
    viewHistoryCache.removeFromCache(historyId);
    
    viewHistoryLogger.info('Item ocultado do histórico');
    return response;
  } catch (error) {
    const err = error as Error;
    viewHistoryLogger.error(`Erro ao ocultar item ${historyId}`, err);
    throw error;
  }
}

// Log apenas quando carrega em desenvolvimento
if (import.meta.env.DEV) {
  viewHistoryLogger.info('View History Service simplificado carregado');
}