// favorites.service.ts - Serviço simples para favoritos usando a API
import apiClient from './client';
import type { Property } from '../types/property';

// Response types do backend
export interface FavoritePropertiesResponse {
  favorites: Property[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface SuccessResponse {
  success: boolean;
  message: string;
}

/**
 * Obter favoritos do usuário
 */
export async function getFavoriteProperties(): Promise<Property[]> {
  try {
    const response = await apiClient.get<FavoritePropertiesResponse>('/api/favorites');
    return response.favorites || [];
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    return [];
  }
}

/**
 * Adicionar aos favoritos
 */
export async function addToFavorites(propertyId: string): Promise<boolean> {
  try {
    await apiClient.post<SuccessResponse>('/api/favorites', { propertyId });
    return true;
  } catch (error) {
    console.error('Erro ao adicionar favorito:', error);
    return false;
  }
}

/**
 * Remover dos favoritos
 */
export async function removeFromFavorites(propertyId: string): Promise<boolean> {
  try {
    await apiClient.delete<SuccessResponse>(`/api/favorites/${propertyId}`);
    return true;
  } catch (error) {
    console.error('Erro ao remover favorito:', error);
    return false;
  }
}

/**
 * Verificar se é favorito
 */
export async function isFavorite(propertyId: string): Promise<boolean> {
  try {
    const response = await apiClient.get<{isFavorite: boolean}>(`/api/favorites/${propertyId}/status`);
    return response.isFavorite;
  } catch (error) {
    console.error('Erro ao verificar favorito:', error);
    return false;
  }
}