// saved-searches.service.ts - Serviço para pesquisas salvas
import apiClient from "./client";
import type { 
  SavedSearch, 
  CreateSavedSearchRequest,
  SavedSearchesResponse 
} from "../types/PersonalArea";
import type { Property } from "../types/property";

// Response types especificas para pesquisas salvas
interface SavedSearchDetailsResponse extends SavedSearch {
  recentResults?: Property[];
  resultHistory?: Array<{
    date: string;
    resultCount: number;
    newResults: number;
  }>;
}

interface SavedSearchExecuteResponse {
  properties: Property[];
  totalCount: number;
  newCount: number;
  aiResponse?: string;
  executedAt: string;
}

// Fun��o simples para logs
function logToTerminal(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = level === 'error' ? '?' : level === 'warn' ? '??' : '??';
  console.log(`${prefix} [${timestamp}] SAVED_SEARCHES: ${message}`);
}

/**
 * Obter todas as pesquisas salvas do usu�rio
 */
export async function getSavedSearches(): Promise<SavedSearchesResponse> {
  logToTerminal('Buscando pesquisas salvas do usu�rio');

  try {
    const response = await apiClient.get<SavedSearchesResponse>('/api/saved-searches');
    
    logToTerminal(`${response.searches?.length || 0} pesquisas salvas encontradas`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao buscar pesquisas salvas: ${errorMsg}`, 'error');
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
  logToTerminal(`Buscando pesquisa salva: ${searchId}`);

  const params = new URLSearchParams();
  if (includeResults) params.append('includeResults', 'true');
  if (includeHistory) params.append('includeHistory', 'true');

  try {
    const search = await apiClient.get<SavedSearchDetailsResponse>(
      `/api/saved-searches/${searchId}?${params.toString()}`
    );
    
    logToTerminal(`Pesquisa salva encontrada: ${search.name}`);
    return search;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao buscar pesquisa salva ${searchId}: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Criar nova pesquisa salva
 */
export async function createSavedSearch(searchData: CreateSavedSearchRequest): Promise<SavedSearch> {
  logToTerminal(`Criando nova pesquisa salva: ${searchData.name}`);

  try {
    const search = await apiClient.post<SavedSearch>('/api/saved-searches', searchData);
    
    logToTerminal(`Pesquisa salva criada: ${search.id}`);
    return search;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao criar pesquisa salva: ${errorMsg}`, 'error');
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
  logToTerminal(`Atualizando pesquisa salva: ${searchId}`);

  try {
    const search = await apiClient.put<SavedSearch>(`/api/saved-searches/${searchId}`, updates);
    
    logToTerminal(`Pesquisa salva atualizada: ${search.id}`);
    return search;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao atualizar pesquisa salva: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Excluir pesquisa salva
 */
export async function deleteSavedSearch(searchId: string): Promise<{ success: boolean; message: string }> {
  logToTerminal(`Excluindo pesquisa salva: ${searchId}`);

  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/saved-searches/${searchId}`
    );
    
    logToTerminal(`Pesquisa salva exclu�da`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao excluir pesquisa salva: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Executar uma pesquisa salva
 */
export async function executeSavedSearch(
  searchId: string,
  updateResults: boolean = true
): Promise<SavedSearchExecuteResponse> {
  logToTerminal(`Executando pesquisa salva: ${searchId}`);

  const params = new URLSearchParams();
  if (updateResults) params.append('updateResults', 'true');

  try {
    const response = await apiClient.post<SavedSearchExecuteResponse>(
      `/api/saved-searches/${searchId}/execute?${params.toString()}`
    );
    
    logToTerminal(`Pesquisa executada: ${response.properties.length} propriedades encontradas`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao executar pesquisa salva: ${errorMsg}`, 'error');
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
  logToTerminal(`Duplicando pesquisa salva: ${searchId}`);

  try {
    const search = await apiClient.post<SavedSearch>(`/api/saved-searches/${searchId}/duplicate`, {
      newName: newName || undefined
    });
    
    logToTerminal(`Pesquisa salva duplicada: ${search.id}`);
    return search;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao duplicar pesquisa salva: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Marcar pesquisa salva como visualizada (limpar badge "novos resultados")
 */
export async function markSavedSearchAsViewed(searchId: string): Promise<{ success: boolean; message: string }> {
  logToTerminal(`Marcando pesquisa salva como visualizada: ${searchId}`);

  try {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/api/saved-searches/${searchId}/mark-viewed`
    );
    
    logToTerminal(`Pesquisa salva marcada como visualizada`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao marcar pesquisa como visualizada: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Obter estat�sticas das pesquisas salvas do usu�rio
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
  logToTerminal('Buscando estat�sticas das pesquisas salvas');

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
    
    logToTerminal(`Estat�sticas: ${stats.totalSearches} pesquisas, ${stats.newResults} novos resultados`);
    return stats;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao buscar estat�sticas: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Converter pesquisa salva em alerta de propriedade
 */
export async function convertSearchToAlert(
  searchId: string,
  alertName?: string,
  emailNotifications: boolean = true,
  smsNotifications: boolean = false
): Promise<{ alertId: string; message: string }> {
  logToTerminal(`Convertendo pesquisa salva em alerta: ${searchId}`);

  try {
    const response = await apiClient.post<{ alertId: string; message: string }>(
      `/api/saved-searches/${searchId}/convert-to-alert`,
      {
        alertName,
        emailNotifications,
        smsNotifications
      }
    );
    
    logToTerminal(`Pesquisa convertida em alerta: ${response.alertId}`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao converter pesquisa em alerta: ${errorMsg}`, 'error');
    throw error;
  }
}

// Utils para pesquisas salvas
export const savedSearchUtils = {
  /**
   * Formatar filtros da pesquisa em texto leg�vel
   */
  formatFilters: (search: SavedSearch): string => {
    const filters = [];
    
    if (search.filters.location) filters.push(`?? ${search.filters.location}`);
    if (search.filters.propertyType && search.filters.propertyType !== 'any') {
      filters.push(`?? ${search.filters.propertyType}`);
    }
    if (search.filters.bedrooms) filters.push(`??? ${search.filters.bedrooms}+ quartos`);
    if (search.filters.priceRange) {
      const [min, max] = search.filters.priceRange;
      filters.push(`?? �${min.toLocaleString()} - �${max.toLocaleString()}`);
    }
    if (search.filters.hasGarage) filters.push(`?? Com garagem`);
    
    return filters.join(' � ') || 'Sem filtros espec�ficos';
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
   * Gerar sugest�o de nome baseado na query e filtros
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

// Log apenas quando carrega em desenvolvimento
if (import.meta.env.DEV) {
  logToTerminal('Saved Searches Service carregado');
}