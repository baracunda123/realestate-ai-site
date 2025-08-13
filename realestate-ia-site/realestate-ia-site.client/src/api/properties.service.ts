// properties.service.ts
// Service for handling property-related API requests

import { ApiClient } from "./client";
import sessionService from "./session.service";
import type { Property } from "../types/property";

interface SearchAIRequest {
    searchQuery: string;
}

interface SearchAIResponse {
    properties: Property[];
    aiResponse: string;
}

const api = new ApiClient();

export async function searchProperties({
    searchQuery,
    signal
}: SearchAIRequest & { signal?: AbortSignal }): Promise<SearchAIResponse> {
    // Agora só envia a query - sessionId vai automaticamente no header
    const request = { 
        query: searchQuery
        // sessionId removido daqui - vai no header X-Session-ID
    };

    const data = await api.post<SearchAIResponse>(
        "/api/SearchAI",
        request,
        { signal }
    );

    return data;
}

/**
 * Clears the current conversation context by regenerating the session ID
 */
export function clearConversationContext(): void {
    sessionService.clearSession();
}

/**
 * Gets the current session ID
 */
export function getCurrentSessionId(): string {
    return sessionService.getSessionId();
}