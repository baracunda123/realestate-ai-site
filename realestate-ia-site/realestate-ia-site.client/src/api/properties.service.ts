// properties.service.ts
// Service for handling property-related API requests

import { ApiClient } from "./client";

import type { Property } from "../types/property";
interface SearchAIrequest {
    searchQuery: string;
}

interface SearchAIResponse {
    properties: Property[];
    AIResponse: string;
}

const api = new ApiClient();

export async function searchProperties({
    searchQuery,
    signal
}: SearchAIrequest & { signal?: AbortSignal }): Promise<SearchAIResponse> {
    const request = { query: searchQuery };

    const data  = await api.post<SearchAIResponse>(
        "/api/SearchAI",
        request,
        { signal } // <- axios usa isso pra abortar
    );

    console.log("API Response:", data);

    return data;
}