// recommendations.service.ts - Serviço para recomendações de propriedades
import apiClient from "./client";
import { logger } from "../utils/logger";
import type { Property } from "../types/property";

// Response types para recomendações
export interface RecommendedProperty {
  propertyId: string;
  title: string;
  location: string;
  price?: number;
  bedrooms?: number;
  type?: string;
  link?: string;
  score: number;
  reason: string;
  createdAt: string;
  isViewed: boolean;
}

export interface DashboardRecommendations {
  properties: RecommendedProperty[];
  totalCount: number;
  lastUpdated: string;
}

export interface RecommendationStats {
  total: number;
  active: number;
  viewed: number;
  unviewed: number;
  averageScore: number;
  byReason: Record<string, number>;
}

/**
 * Obter recomendações para o dashboard
 */
export async function getDashboardRecommendations(
  limit: number = 10
): Promise<DashboardRecommendations> {
  logger.info(`Buscando recomendações do dashboard (limite: ${limit})`, 'RECOMMENDATIONS');

  try {
    const response = await apiClient.get<DashboardRecommendations>(
      `/api/recommendations/dashboard?limit=${limit}`
    );
    
    logger.info(`${response.properties?.length || 0} recomendações encontradas`, 'RECOMMENDATIONS');
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao buscar recomendações: ${errorMsg}`, 'RECOMMENDATIONS');
    throw error;
  }
}

/**
 * Marcar recomendação como visualizada
 */
export async function markRecommendationAsViewed(
  propertyId: string
): Promise<{ success: boolean; message: string }> {
  logger.info(`Marcando recomendação como visualizada: ${propertyId}`, 'RECOMMENDATIONS');

  try {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/api/recommendations/${propertyId}/mark-viewed`
    );
    
    logger.info('Recomendação marcada como visualizada', 'RECOMMENDATIONS');
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao marcar recomendação como visualizada: ${errorMsg}`, 'RECOMMENDATIONS');
    throw error;
  }
}

/**
 * Descartar recomendação (marcar como inativa)
 */
export async function dismissRecommendation(
  propertyId: string
): Promise<{ success: boolean; message: string }> {
  logger.info(`Descartando recomendação: ${propertyId}`, 'RECOMMENDATIONS');

  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/recommendations/${propertyId}`
    );
    
    logger.info('Recomendação descartada', 'RECOMMENDATIONS');
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao descartar recomendação: ${errorMsg}`, 'RECOMMENDATIONS');
    throw error;
  }
}

/**
 * Obter estatísticas das recomendações do usuário
 */
export async function getRecommendationStats(): Promise<RecommendationStats> {
  logger.info('Buscando estatísticas das recomendações', 'RECOMMENDATIONS');

  try {
    const stats = await apiClient.get<RecommendationStats>('/api/recommendations/stats');
    
    logger.info(`Estatísticas: ${stats.unviewed} não visualizadas, score médio: ${stats.averageScore}`, 'RECOMMENDATIONS');
    return stats;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao buscar estatísticas: ${errorMsg}`, 'RECOMMENDATIONS');
    throw error;
  }
}

/**
 * Refresh completo das recomendações baseado no perfil atual
 */
export async function refreshRecommendations(): Promise<{
  success: boolean;
  message: string;
}> {
  logger.info('Fazendo refresh das recomendações baseado no perfil atual', 'RECOMMENDATIONS');

  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>('/api/recommendations/refresh');
    
    logger.info('Recomendações atualizadas com sucesso', 'RECOMMENDATIONS');
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao fazer refresh das recomendações: ${errorMsg}`, 'RECOMMENDATIONS');
    throw error;
  }
}

// Utils para recomendações
export const recommendationUtils = {
  /**
   * Converter recomendação para Property (para compatibilidade)
   */
  toProperty: (recommendation: RecommendedProperty): Partial<Property> => ({
    id: recommendation.propertyId,
    title: recommendation.title,
    location: recommendation.location,
    price: recommendation.price,
    bedrooms: recommendation.bedrooms,
    type: recommendation.type
  }),

  /**
   * Verificar se a recomendação é nova (menos de 24h)
   */
  isNew: (createdAt: string): boolean => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return diffHours < 24;
  }
};

logger.info('Recommendations Service carregado', 'RECOMMENDATIONS');