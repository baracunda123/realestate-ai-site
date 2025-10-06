// favorites.service.ts - Serviço simples para favoritos usando a API
import apiClient from './client';
import { favorites as logger } from '../utils/logger';
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
    logger.error('Erro ao buscar favoritos', error as Error);
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
    logger.error('Erro ao adicionar favorito', error as Error);
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
    logger.error('Erro ao remover favorito', error as Error);
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
    logger.error('Erro ao verificar favorito', error as Error);
    return false;
  }
}