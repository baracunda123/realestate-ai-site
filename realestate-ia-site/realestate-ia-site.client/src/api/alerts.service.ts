// alerts.service.ts - Serviço para alertas de propriedades (simplificado)
import apiClient from "./client";
import type { 
  PropertyAlert, 
  CreateAlertRequest, 
  UpdateAlertRequest,
  AlertsResponse 
} from "../types/PersonalArea";

// Response types essenciais
interface AlertTestResponse {
  potentialMatches: Array<{
    id: string;
    title: string;
    location?: string;
    price: number;
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
    listingDate: string;
    isNew: boolean;
  }>;
  estimatedMatchCount: number;
  recommendations: string[];
}

// Função simples para logs
function logToTerminal(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '🔍';
  console.log(`${prefix} [${timestamp}] ALERTS: ${message}`);
}

/**
 * Obter todos os alertas do usuário
 */
export async function getUserAlerts(
  includeInactive: boolean = false
): Promise<AlertsResponse> {
  logToTerminal(`Buscando alertas do usuário (incluir inativos: ${includeInactive})`);

  const params = new URLSearchParams();
  if (includeInactive) params.append('includeInactive', 'true');

  try {
    const response = await apiClient.get<AlertsResponse>(`/api/alerts?${params.toString()}`);
    
    logToTerminal(`${response.alerts?.length || 0} alertas encontrados (${response.activeCount} ativos)`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao buscar alertas: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Obter detalhes de um alerta específico
 */
export async function getAlertById(alertId: string): Promise<PropertyAlert> {
  logToTerminal(`Buscando alerta: ${alertId}`);

  try {
    const alert = await apiClient.get<PropertyAlert>(`/api/alerts/${alertId}`);
    
    logToTerminal(`Alerta encontrado: ${alert.name}`);
    return alert;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao buscar alerta ${alertId}: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Criar novo alerta
 */
export async function createAlert(alertData: CreateAlertRequest): Promise<PropertyAlert> {
  logToTerminal(`Criando novo alerta: ${alertData.name}`);

  try {
    const alert = await apiClient.post<PropertyAlert>('/api/alerts', alertData);
    
    logToTerminal(`Alerta criado: ${alert.id}`);
    return alert;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao criar alerta: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Atualizar alerta existente
 */
export async function updateAlert(
  alertId: string,
  updates: Partial<UpdateAlertRequest>
): Promise<PropertyAlert> {
  logToTerminal(`Atualizando alerta: ${alertId}`);

  try {
    const alert = await apiClient.put<PropertyAlert>(`/api/alerts/${alertId}`, updates);
    
    logToTerminal(`Alerta atualizado: ${alert.id}`);
    return alert;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao atualizar alerta: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Ativar/desativar alerta
 */
export async function toggleAlert(
  alertId: string,
  isActive: boolean
): Promise<PropertyAlert> {
  logToTerminal(`${isActive ? 'Ativando' : 'Desativando'} alerta: ${alertId}`);

  try {
    const alert = await apiClient.patch<PropertyAlert>(`/api/alerts/${alertId}/toggle`, {
      isActive
    });
    
    logToTerminal(`Alerta ${isActive ? 'ativado' : 'desativado'}: ${alert.id}`);
    return alert;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao alterar status do alerta: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Excluir alerta
 */
export async function deleteAlert(alertId: string): Promise<{ success: boolean; message: string }> {
  logToTerminal(`Excluindo alerta: ${alertId}`);

  try {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/api/alerts/${alertId}`
    );
    
    logToTerminal(`Alerta excluído`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao excluir alerta: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Testar alerta (ver quantas propriedades ele encontraria)
 */
export async function testAlert(alertData: CreateAlertRequest): Promise<AlertTestResponse> {
  logToTerminal(`Testando critérios do alerta: ${alertData.name}`);

  try {
    const response = await apiClient.post<AlertTestResponse>('/api/alerts/test', alertData);
    
    logToTerminal(`Teste do alerta: ${response.estimatedMatchCount} propriedades encontradas`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao testar alerta: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Marcar novas propriedades como visualizadas (limpar badge "novo")
 */
export async function markAlertAsViewed(alertId: string): Promise<{ success: boolean; message: string }> {
  logToTerminal(`Marcando alerta como visualizado: ${alertId}`);

  try {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `/api/alerts/${alertId}/mark-viewed`
    );
    
    logToTerminal(`Alerta marcado como visualizado`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao marcar alerta como visualizado: ${errorMsg}`, 'error');
    throw error;
  }
}

// Utils para alertas (simplificados)
export const alertUtils = {
  /**
   * Formatar critérios do alerta em texto legível
   */
  formatCriteria: (alert: PropertyAlert): string => {
    const criteria = [];
    
    if (alert.location) criteria.push(`📍 ${alert.location}`);
    if (alert.propertyType && alert.propertyType !== 'any') {
      criteria.push(`🏠 ${alert.propertyType}`);
    }
    if (alert.bedrooms) criteria.push(`🛏️ ${alert.bedrooms}+ quartos`);
    if (alert.bathrooms) criteria.push(`🚿 ${alert.bathrooms}+ banheiros`);
    if (alert.minPrice || alert.maxPrice) {
      const min = alert.minPrice ? `€${alert.minPrice.toLocaleString()}` : '0';
      const max = alert.maxPrice ? `€${alert.maxPrice.toLocaleString()}` : '∞';
      criteria.push(`💰 ${min} - ${max}`);
    }
    
    return criteria.join(' • ');
  },

  /**
   * Verificar se alerta tem novos resultados
   */
  hasNewMatches: (alert: PropertyAlert): boolean => {
    return alert.newMatches > 0;
  },

  /**
   * Calcular performance do alerta
   */
  calculatePerformance: (alert: PropertyAlert): 'excellent' | 'good' | 'poor' | 'none' => {
    if (alert.matchCount === 0) return 'none';
    if (alert.matchCount >= 10) return 'excellent';
    if (alert.matchCount >= 5) return 'good';
    return 'poor';
  }
};

// Log apenas quando carrega em desenvolvimento
if (import.meta.env.DEV) {
  logToTerminal('Alerts Service carregado (simplificado)');
}