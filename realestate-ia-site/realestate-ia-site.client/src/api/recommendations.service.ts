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
  reasonText: string;
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
  const prefix = level === 'error' ? '?' : level === 'warn' ? '??' : '?';
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
 * Gerar recomendações manualmente (para testing)
 */
export async function generateRecommendationsManually(): Promise<{
  success: boolean;
  message: string;
  count: number;
}> {
  logToTerminal('Gerando recomendações manualmente');

  try {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      count: number;
    }>('/api/recommendations/generate');
    
    logToTerminal(`Recomendações geradas: ${response.count}`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao gerar recomendações: ${errorMsg}`, 'error');
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
   * Formatar texto da razão da recomendação
   */
  formatReason: (reason: string): string => {
    const reasons: Record<string, string> = {
      'nova_propriedade': 'Nova Propriedade',
      'reducao_preco': 'Redução de Preço',
      'localizacao_preferida': 'Localização Preferida',
      'tipo_preferido': 'Tipo Preferido',
      'orcamento_adequado': 'Dentro do Orçamento'
    };
    return reasons[reason] || reason;
  },

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
   * Obter descrição baseada no score
   */
  getScoreDescription: (score: number): string => {
    if (score >= 90) return 'Excelente correspondência';
    if (score >= 80) return 'Boa correspondência';
    if (score >= 70) return 'Correspondência moderada';
    return 'Correspondência baixa';
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

// Log apenas quando carrega em desenvolvimento
try {
  if (process.env.NODE_ENV === 'development') {
    logToTerminal('Recommendations Service carregado');
  }
} catch {
  // Ignorar se verificação de ambiente falhar
}