// saved-searches.service.ts - Serviço para pesquisas salvas
import apiClient from "./client";
import type { 
  SavedSearch, 
  CreateSavedSearchRequest,
  SavedSearchesResponse 
} from "../types/PersonalArea";
import type { Property } from "../types/property";
import { logger } from '../utils/logger';

// Response types especificas para pesquisas salvas
interface SavedSearchDetailsResponse extends SavedSearch {
  recentResults?: Property[];
  resultHistory?: Array<{
    date: string;
    resultCount: number;
    newResults: number;
  }>[];
}

/**
 * Obter todas as pesquisas salvas do usuário
 */
export async function getSavedSearches(): Promise<SavedSearchesResponse> {
  logger.info('Buscando pesquisas salvas do usuário', 'SAVED_SEARCHES');

  try {
    const response = await apiClient.get<SavedSearchesResponse>('/api/saved-searches');
    
    logger.info(`${response.searches?.length || 0} pesquisas salvas encontradas`, 'SAVED_SEARCHES');
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao buscar pesquisas salvas: ${errorMsg}`, 'SAVED_SEARCHES', error as Error);
    throw error;
  }
}

/**
 * Obter detalhes de uma pesquisa salva especifica
 */
export async function getSavedSearchById(
  searchId: string,
  includeResults: boolean = false,
  includeHistory: boolean = false
): Promise<SavedSearchDetailsResponse> {
  logger.info(`Buscando pesquisa salva: ${searchId}`, 'SAVED_SEARCHES');

  const params = new URLSearchParams();
  if (includeResults) params.append('includeResults', 'true');
  if (includeHistory) params.append('includeHistory', 'true');

  try {
    const search = await apiClient.get<SavedSearchDetailsResponse>(
      `/api/saved-searches/${searchId}?${params.toString()}`
    );
    
    logger.info(`Pesquisa salva encontrada: ${search.name}`, 'SAVED_SEARCHES');
    return search;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao buscar pesquisa salva ${searchId}: ${errorMsg}`, 'SAVED_SEARCHES', error as Error);
    throw error;
  }
}

/**
 * Criar nova pesquisa salva
 */
export async function createSavedSearch(searchData: CreateSavedSearchRequest): Promise<SavedSearch> {
  logger.info(`Criando nova pesquisa salva: ${searchData.name}`, 'SAVED_SEARCHES');

  try {
    const search = await apiClient.post<SavedSearch>('/api/saved-searches', searchData);
    
    logger.info(`Pesquisa salva criada: ${search.id}`, 'SAVED_SEARCHES');
    return search;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao criar pesquisa salva: ${errorMsg}`, 'SAVED_SEARCHES', error as Error);
    throw error;
  }
}

/**
 * Atualizar pesquisa salva existente
 */
export async function updateSavedSearch(
  searchId: string,
  updates: Partial<CreateSavedSearchRequest>
): Promise<SavedSearch> {
  logger.info(`Atualizando pesquisa salva: ${searchId}`, 'SAVED_SEARCHES');

  try {
    const search = await apiClient.put<SavedSearch>(`/api/saved-searches/${searchId}`, updates);
    
    logger.info(`Pesquisa salva atualizada: ${search.id}`, 'SAVED_SEARCHES');
    return search;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao atualizar pesquisa salva: ${errorMsg}`, 'SAVED_SEARCHES', error as Error);
    throw error;
  }
}

/**
 * Excluir pesquisa salva
 */
export async function deleteSavedSearch(searchId: string): Promise<{ success: boolean; message: string }> {
  logger.info(`Excluindo pesquisa salva: ${searchId}`, 'SAVED_SEARCHES');

  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/saved-searches/${searchId}`
    );
    
    logger.info(`Pesquisa salva excluída`, 'SAVED_SEARCHES');
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao excluir pesquisa salva: ${errorMsg}`, 'SAVED_SEARCHES', error as Error);
    throw error;
  }
}

/**
 * Duplicar pesquisa salva existente
 */
export async function duplicateSavedSearch(
  searchId: string,
  newName?: string
): Promise<SavedSearch> {
  logger.info(`Duplicando pesquisa salva: ${searchId}`, 'SAVED_SEARCHES');

  try {
    const search = await apiClient.post<SavedSearch>(`/api/saved-searches/${searchId}/duplicate`, {
      newName: newName || undefined
    });
    
    logger.info(`Pesquisa salva duplicada: ${search.id}`, 'SAVED_SEARCHES');
    return search;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao duplicar pesquisa salva: ${errorMsg}`, 'SAVED_SEARCHES', error as Error);
    throw error;
  }
}

/**
 * Marcar pesquisa salva como visualizada (limpar badge "novos resultados")
 */
export async function markSavedSearchAsViewed(searchId: string): Promise<{ success: boolean; message: string }> {
  logger.info(`Marcando pesquisa salva como visualizada: ${searchId}`, 'SAVED_SEARCHES');

  try {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/api/saved-searches/${searchId}/mark-viewed`
    );
    
    logger.info(`Pesquisa salva marcada como visualizada`, 'SAVED_SEARCHES');
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao marcar pesquisa como visualizada: ${errorMsg}`, 'SAVED_SEARCHES', error as Error);
    throw error;
  }
}

/**
 * Obter estatísticas das pesquisas salvas do usuário
 */
export async function getSavedSearchesStats(): Promise<{
  totalSearches: number;
  totalResults: number;
  newResults: number;
  mostSuccessfulSearch?: {
    id: string;
    name: string;
    resultCount: number;
  };
  recentActivity: Array<{
    searchId: string;
    searchName: string;
    executedAt: string;
    resultCount: number;
    newResults: number;
  }>;
}> {
  logger.info('Buscando estatísticas das pesquisas salvas', 'SAVED_SEARCHES');

  try {
    const stats = await apiClient.get<{
      totalSearches: number;
      totalResults: number;
      newResults: number;
      mostSuccessfulSearch?: {
        id: string;
        name: string;
        resultCount: number;
      };
      recentActivity: Array<{
        searchId: string;
        searchName: string;
        executedAt: string;
        resultCount: number;
        newResults: number;
      }>;
    }>('/api/saved-searches/stats');
    
    logger.info(`Estatísticas: ${stats.totalSearches} pesquisas, ${stats.newResults} novos resultados`, 'SAVED_SEARCHES');
    return stats;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao buscar estatísticas: ${errorMsg}`, 'SAVED_SEARCHES', error as Error);
    throw error;
  }
}

/**
 * Converter pesquisa salva em alerta de propriedade
 */
export async function convertSearchToAlert(
  searchId: string,
  alertName: string
): Promise<{ alertId: string; message: string }> {
  logger.info(`Convertendo pesquisa salva em alerta: ${searchId}`, 'SAVED_SEARCHES');

  try {
    const response = await apiClient.post<{ alertId: string; message: string }>(
      `/api/saved-searches/${searchId}/convert-to-alert`,
      {
        alertName
      }
    );
    
    logger.info(`Pesquisa convertida em alerta: ${response.alertId}`, 'SAVED_SEARCHES');
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao converter pesquisa em alerta: ${errorMsg}`, 'SAVED_SEARCHES', error as Error);
    throw error;
  }
}

// Utils para pesquisas salvas
export const savedSearchUtils = {
  /**
   * Formatar filtros da pesquisa em texto legível
   */
  formatFilters: (search: SavedSearch): string => {
    const filters = [];
    
    if (search.filters.location) filters.push(`📍 ${search.filters.location}`);
    if (search.filters.propertyType && search.filters.propertyType !== 'any') {
      filters.push(`🏠 ${search.filters.propertyType}`);
    }
    if (search.filters.bedrooms) filters.push(`🛏️ ${search.filters.bedrooms}+ quartos`);
    if (search.filters.priceRange) {
      const [min, max] = search.filters.priceRange;
      filters.push(`💰 €${min.toLocaleString()} - €${max.toLocaleString()}`);
    }
    if (search.filters.hasGarage) filters.push(`🚗 Com garagem`);
    
    return filters.join(' • ') || 'Sem filtros específicos';
  },

  /**
   * Verificar se pesquisa tem novos resultados
   */
  hasNewResults: (search: SavedSearch): boolean => {
    return search.newResults > 0;
  },

  /**
   * Calcular performance da pesquisa
   */
  calculatePerformance: (search: SavedSearch): 'excellent' | 'good' | 'poor' | 'none' => {
    if (search.results === 0) return 'none';
    if (search.results >= 20) return 'excellent';
    if (search.results >= 10) return 'good';
    return 'poor';
  },

  /**
   * Gerar sugestão de nome baseado na query e filtros
   */
  generateName: (query: string, filters: SavedSearch['filters']): string => {
    const parts = [];
    
    if (query) {
      // Pegar primeiras palavras da query
      const queryWords = query.split(' ').slice(0, 3).join(' ');
      parts.push(queryWords);
    }
    
    if (filters.location) {
      parts.push(filters.location);
    }
    
    if (filters.propertyType && filters.propertyType !== 'any') {
      parts.push(filters.propertyType);
    }
    
    if (filters.bedrooms) {
      parts.push(`${filters.bedrooms}Q`);
    }
    
    return parts.join(' ') || 'Minha Pesquisa';
  },

  /**
   * Verificar se pesquisa pode ser convertida em alerta
   */
  canConvertToAlert: (search: SavedSearch): boolean => {
    // Verificar se pesquisa tem critérios bem definidos
    return !!(search.filters.location || search.filters.propertyType !== 'any');
  }
};

logger.info('Saved Searches Service carregado');