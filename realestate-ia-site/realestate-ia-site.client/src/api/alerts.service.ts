// alerts.service.ts - Servi�o para alertas de propriedades alinhado com BD
import apiClient from "./client";
import type { 
  PropertyAlert, 
  CreateAlertRequest, 
  UpdateAlertRequest,
  AlertsResponse 
} from "../types/PersonalArea";
import type { Property } from "../types/property";

// Response types espec�ficas para alertas
interface AlertDetailsResponse extends PropertyAlert {
  matchingProperties?: Property[];
  lastMatchedProperties?: Property[];
  triggerHistory?: Array<{
    id: string;
    triggeredAt: string;
    reason: 'new_listing' | 'price_drop';
    propertyId: string;
    propertyTitle: string;
    oldPrice?: number;
    newPrice?: number;
  }>;
}

interface AlertTestResponse {
  potentialMatches: Property[];
  estimatedMatchCount: number;
  recommendations: string[];
}

// Fun��o simples para logs
function logToTerminal(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = level === 'error' ? '?' : level === 'warn' ? '??' : '??';
  console.log(`${prefix} [${timestamp}] ALERTS: ${message}`);
}

/**
 * Obter todos os alertas do usu�rio
 */
export async function getUserAlerts(
  includeInactive: boolean = false
): Promise<AlertsResponse> {
  logToTerminal(`Buscando alertas do usu�rio (incluir inativos: ${includeInactive})`);

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
 * Obter detalhes de um alerta espec�fico
 */
export async function getAlertById(
  alertId: string,
  includeMatches: boolean = false,
  includeHistory: boolean = false
): Promise<AlertDetailsResponse> {
  logToTerminal(`Buscando alerta: ${alertId}`);

  const params = new URLSearchParams();
  if (includeMatches) params.append('includeMatches', 'true');
  if (includeHistory) params.append('includeHistory', 'true');

  try {
    const alert = await apiClient.get<AlertDetailsResponse>(
      `/api/alerts/${alertId}?${params.toString()}`
    );
    
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
    
    logToTerminal(`Alerta exclu�do`);
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
  logToTerminal(`Testando crit�rios do alerta: ${alertData.name}`);

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
 * Obter propriedades que atendem aos crit�rios de um alerta
 */
export async function getAlertMatches(
  alertId: string,
  page: number = 1,
  pageSize: number = 20,
  onlyNew: boolean = false
): Promise<{
  properties: Property[];
  totalCount: number;
  newCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
}> {
  logToTerminal(`Buscando propriedades do alerta: ${alertId} (p�gina ${page})`);

  const params = new URLSearchParams();
  params.append('page', page.toString());
  params.append('pageSize', pageSize.toString());
  if (onlyNew) params.append('onlyNew', 'true');

  try {
    const response = await apiClient.get<{
      properties: Property[];
      totalCount: number;
      newCount: number;
      page: number;
      pageSize: number;
      hasNextPage: boolean;
    }>(`/api/alerts/${alertId}/matches?${params.toString()}`);
    
    logToTerminal(`${response.properties.length} propriedades encontradas para o alerta`);
    return response;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao buscar propriedades do alerta: ${errorMsg}`, 'error');
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

/**
 * Obter estat�sticas dos alertas do usu�rio
 */
export async function getAlertsStats(): Promise<{
  totalAlerts: number;
  activeAlerts: number;
  totalMatches: number;
  newMatches: number;
  lastTriggered?: string;
  topPerformingAlert?: {
    id: string;
    name: string;
    matchCount: number;
  };
}> {
  logToTerminal('Buscando estat�sticas dos alertas');

  try {
    const stats = await apiClient.get<{
      totalAlerts: number;
      activeAlerts: number;
      totalMatches: number;
      newMatches: number;
      lastTriggered?: string;
      topPerformingAlert?: {
        id: string;
        name: string;
        matchCount: number;
      };
    }>('/api/alerts/stats');
    
    logToTerminal(`Estat�sticas: ${stats.activeAlerts}/${stats.totalAlerts} alertas ativos, ${stats.newMatches} novos matches`);
    return stats;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao buscar estat�sticas: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Duplicar alerta existente
 */
export async function duplicateAlert(
  alertId: string,
  newName?: string
): Promise<PropertyAlert> {
  logToTerminal(`Duplicando alerta: ${alertId}`);

  try {
    const alert = await apiClient.post<PropertyAlert>(`/api/alerts/${alertId}/duplicate`, {
      newName: newName || undefined
    });
    
    logToTerminal(`Alerta duplicado: ${alert.id}`);
    return alert;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao duplicar alerta: ${errorMsg}`, 'error');
    throw error;
  }
}

/**
 * Obter sugest�es de melhorias para um alerta
 */
export async function getAlertOptimizationSuggestions(alertId: string): Promise<{
  suggestions: Array<{
    type: 'location_expand' | 'price_adjust' | 'criteria_relax';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    estimatedAdditionalMatches: number;
  }>;
  currentPerformance: {
    matchCount: number;
    avgMatchesPerWeek: number;
    lastMatch?: string;
  };
}> {
  logToTerminal(`Buscando sugest�es de otimiza��o para alerta: ${alertId}`);

  try {
    const suggestions = await apiClient.get<{
      suggestions: Array<{
        type: 'location_expand' | 'price_adjust' | 'criteria_relax';
        title: string;
        description: string;
        impact: 'low' | 'medium' | 'high';
        estimatedAdditionalMatches: number;
      }>;
      currentPerformance: {
        matchCount: number;
        avgMatchesPerWeek: number;
        lastMatch?: string;
      };
    }>(`/api/alerts/${alertId}/optimize`);
    
    logToTerminal(`${suggestions.suggestions.length} sugest�es de otimiza��o encontradas`);
    return suggestions;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logToTerminal(`Erro ao buscar sugest�es: ${errorMsg}`, 'error');
    throw error;
  }
}

// Utils para alertas
export const alertUtils = {
  /**
   * Formatar crit�rios do alerta em texto leg�vel
   */
  formatCriteria: (alert: PropertyAlert): string => {
    const criteria = [];
    
    if (alert.location) criteria.push(`?? ${alert.location}`);
    if (alert.propertyType && alert.propertyType !== 'any') {
      criteria.push(`?? ${alert.propertyType}`);
    }
    if (alert.bedrooms) criteria.push(`??? ${alert.bedrooms}+ quartos`);
    if (alert.bathrooms) criteria.push(`?? ${alert.bathrooms}+ banheiros`);
    if (alert.minPrice || alert.maxPrice) {
      const min = alert.minPrice ? `�${alert.minPrice.toLocaleString()}` : '0';
      const max = alert.maxPrice ? `�${alert.maxPrice.toLocaleString()}` : '?';
      criteria.push(`?? ${min} - ${max}`);
    }
    
    return criteria.join(' � ');
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
  },

  /**
   * Verificar se alerta pode receber SMS
   */
  canReceiveSms: (alert: PropertyAlert): boolean => {
    return alert.smsNotifications;
  }
};

// Log apenas quando carrega em desenvolvimento
if (import.meta.env.DEV) {
  logToTerminal('Alerts Service carregado');
}