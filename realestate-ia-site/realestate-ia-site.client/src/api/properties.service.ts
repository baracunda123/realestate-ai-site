// properties.service.ts - Serviço atualizado sem o controller properties que foi removido
import apiClient from "./client";
import { properties as logger } from "../utils/logger";
import type { Property } from "../types/property";

// Interfaces específicas para API de pesquisa (sem properties controller)
interface SearchAIRequest {
  searchQuery: string;
  includeAiAnalysis?: boolean;
  includeMarketData?: boolean;
  filters?: Record<string, string | number | boolean>;
  sessionId?: string;
}

interface SearchAIResponse {
  properties: Property[];
  aiResponse: string;
  aiSummary?: string;
  totalCount: number;
  appliedFilters?: Record<string, string | number | boolean>;
  marketInsights?: {
    averagePrice: number;
    priceRange: [number, number];
    totalListings: number;
    recommendations: string[];
  };
  sessionId?: string;
  sessionTitleUpdated?: boolean;
  updatedSessionTitle?: string;
}

interface FavoritePropertiesResponse {
  favorites: Property[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Pesquisa avançada com IA
 */
export async function searchProperties({
  searchQuery,
  includeAiAnalysis = true,
  includeMarketData = false,
  filters,
  sessionId,
  signal
}: SearchAIRequest & { signal?: AbortSignal }): Promise<SearchAIResponse> {
  logger.info(`Pesquisa IA: "${searchQuery}" | Auth: ${apiClient.isAuthenticated()}`);

  const request = { 
    query: searchQuery,
    includeAiAnalysis,
    includeMarketData,
    filters: filters || {},
    sessionId: sessionId || ''
  };

  try {
    const data = await apiClient.post<SearchAIResponse>(
      "/api/SearchAI",
      request,
      { signal }
    );

    logger.info(`IA encontrou ${data.properties?.length || 0} propriedades`);
    return data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro na pesquisa IA: ${errorMsg}`);
    throw error;
  }
}


/**
 * Obter propriedades favoritas do usuário (usa FavoritesController)
 */
export async function getFavoriteProperties(): Promise<FavoritePropertiesResponse> {
  logger.info('Buscando propriedades favoritas');

  try {
    const response = await apiClient.get<FavoritePropertiesResponse>('/api/favorites');
    
    logger.info(`${response.favorites?.length || 0} propriedades favoritas encontradas`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao buscar favoritas: ${errorMsg}`);
    throw error;
  }
}

/**
 * Adicionar propriedade aos favoritos (usa FavoritesController)
 */
export async function addToFavorites(propertyId: string): Promise<{ success: boolean; message: string }> {
  logger.info(`Adicionando aos favoritos: ${propertyId}`);

  try {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/favorites',
      { propertyId }
    );
    
    logger.info(`Propriedade adicionada aos favoritos`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao adicionar favorita: ${errorMsg}`);
    throw error;
  }
}

/**
 * Remover propriedade dos favoritos (usa FavoritesController)
 */
export async function removeFromFavorites(propertyId: string): Promise<{ success: boolean; message: string }> {
  logger.info(`Removendo dos favoritos: ${propertyId}`);

  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/favorites/${propertyId}`
    );
    
    logger.info(`Propriedade removida dos favoritos`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao remover favorita: ${errorMsg}`);
    throw error;
  }
}

// Utils para propriedades
export const propertyUtils = {
  /**
   * Formatar endereço completo da propriedade
   */
  formatAddress: (property: Property): string => {
    const parts = [
      property.address,
      property.city,
      property.county,
      property.state
    ].filter(Boolean);
    
    return parts.join(', ');
  },


  /**
   * Obter imagens da propriedade como array
   */
  getImages: (property: Property): string[] => {
    if (property.images && Array.isArray(property.images)) {
      return property.images;
    }
    
    if (property.imageUrl) {
      return [property.imageUrl];
    }
    
    return [];
  },

  /**
   * Mapear tipo da BD para UI
   */
  mapPropertyType: (type: string | null): 'house' | 'apartment' | 'condo' | 'townhouse' => {
    switch (type?.toLowerCase()) {
      case 'house':
      case 'casa':
        return 'house';
      case 'apartment':
      case 'apartamento':
        return 'apartment';
      case 'condo':
      case 'condominio':
        return 'condo';
      case 'townhouse':
      case 'sobrado':
        return 'townhouse';
      default:
        return 'apartment';
    }
  }
};

// Log apenas quando carrega em desenvolvimento
logger.info('Properties Service carregado e atualizado (sem controller properties)');