// properties.service.ts - VERSÃO LIMPA E FOCADA
// Service for handling property-related API requests
import apiClient from "./client";
import type { Property } from "../types/property";

interface SearchAIRequest {
    searchQuery: string;
}

interface SearchAIResponse {
    properties: Property[];
    aiResponse: string;
}

// Função simples para logs
function logToTerminal(message: string, level: 'info' | 'warn' | 'error' = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : '🔍';
    console.log(`${prefix} [${timestamp}] ${message}`);
}

/**
 * Realiza pesquisa de propriedades usando IA
 */
export async function searchProperties({
    searchQuery,
    signal
}: SearchAIRequest & { signal?: AbortSignal }): Promise<SearchAIResponse> {
    logToTerminal(`Pesquisa: "${searchQuery}" | Auth: ${apiClient.isAuthenticated()}`);

    const request = { 
        query: searchQuery
    };

    try {
        const data = await apiClient.post<SearchAIResponse>(
            "/api/SearchAI",
            request,
            { signal }
        );

        logToTerminal(`Encontradas ${data.properties?.length || 0} propriedades`);
        return data;

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        logToTerminal(`Erro: ${errorMsg}`, 'error');
        throw error;
    }
}

// Log apenas quando carrega em desenvolvimento
if (import.meta.env.DEV) {
    logToTerminal('Properties Service carregado');
}