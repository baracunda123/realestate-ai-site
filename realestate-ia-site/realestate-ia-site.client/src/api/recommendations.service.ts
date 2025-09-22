// recommendations.service.ts - Serviço para recomendações de propriedades
import apiClient from "./client";
import type { Property } from "../types/property";

// Response types para recomendações
export interface RecommendedProperty {
  propertyId: string;
  title: string;
  location: string;
  price?: number;
  bedrooms?: number;
  type?: string;
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

// Função simples para logs
function logToTerminal(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '🔍';
  console.log(`${prefix} [${timestamp}] RECOMMENDATIONS: ${message}`);
}

/**
 * Obter recomendações para o dashboard
 */
export async function getDashboardRecommendations(
  limit: number = 10
): Promise<DashboardRecommendations> {
  logToTerminal(`Buscando recomendações do dashboard (limite: ${limit})`);

  try {
    const response = await apiClient.get<DashboardRecommendations>(
      `/api/recommendations/dashboard?limit=${limit}`
    );
    
    logToTerminal(`${response.properties?.length || 0} recomendações encontradas`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao buscar recomendações: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Marcar recomendação como visualizada
 */
export async function markRecommendationAsViewed(
  propertyId: string
): Promise<{ success: boolean; message: string }> {
  logToTerminal(`Marcando recomendação como visualizada: ${propertyId}`);

  try {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/api/recommendations/${propertyId}/mark-viewed`
    );
    
    logToTerminal(`Recomendação marcada como visualizada`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao marcar recomendação como visualizada: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Descartar recomendação (marcar como inativa)
 */
export async function dismissRecommendation(
  propertyId: string
): Promise<{ success: boolean; message: string }> {
  logToTerminal(`Descartando recomendação: ${propertyId}`);

  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/recommendations/${propertyId}`
    );
    
    logToTerminal(`Recomendação descartada`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao descartar recomendação: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Obter estatísticas das recomendações do usuário
 */
export async function getRecommendationStats(): Promise<RecommendationStats> {
  logToTerminal('Buscando estatísticas das recomendações');

  try {
    const stats = await apiClient.get<RecommendationStats>('/api/recommendations/stats');
    
    logToTerminal(`Estatísticas: ${stats.unviewed} não visualizadas, score médio: ${stats.averageScore}`);
    return stats;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao buscar estatísticas: ${errorMsg}`, 'error');
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
  logToTerminal('Fazendo refresh das recomendações baseado no perfil atual');

  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
    }>('/api/recommendations/refresh');
    
    logToTerminal('Recomendações atualizadas com sucesso');
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao fazer refresh das recomendações: ${errorMsg}`, 'error');
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
   * Obter cor baseada no score
   */
  getScoreColor: (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-gray-600';
  },

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


if (import.meta.env?.DEV) {
    logToTerminal('Recommendations Service carregado');
}