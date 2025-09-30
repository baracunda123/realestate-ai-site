// map.service.ts - Serviço para funcionalidade de mapa
import apiClient from "./client";
import type { Property } from "../types/property";
import { logger } from "../utils/logger";

// Tipos para coordenadas de propriedades
export interface PropertyCoordinates {
  propertyId: string;
  latitude: number;
  longitude: number;
  address: string;
  accuracy: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface MapProperty {
  id: string;
  title: string;
  price: number | null;
  formattedPrice: string;
  address: string | null;
  city: string | null;
  county: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  accuracy: string;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapDataResponse {
  properties: MapProperty[];
  bounds: MapBounds | null;
  totalProcessed: number;
  totalWithCoordinates: number;
}

/**
 * Obter coordenadas para uma lista de propriedades
 * Usado para mostrar no mapa apenas as propriedades da pesquisa atual
 */
export async function getCoordinatesForProperties(properties: Property[]): Promise<MapDataResponse> {
  if (!properties.length) {
    logger.info('Nenhuma propriedade fornecida para geocoding', 'MAP_SERVICE');
    return {
      properties: [],
      bounds: null,
      totalProcessed: 0,
      totalWithCoordinates: 0
    };
  }

  logger.info(`Obtendo coordenadas para ${properties.length} propriedades`, 'MAP_SERVICE');

  try {
    // Preparar dados das propriedades para enviar ao backend
    const propertyAddresses = properties.map(p => ({
      propertyId: p.id,
      address: p.address,
      city: p.city,
      county: p.county,
      state: p.state
    }));

    // Fazer request para o backend obter coordenadas
    const response = await apiClient.post<{
      coordinates: Array<{
        propertyId: string;
        latitude: number;
        longitude: number;
        formattedAddress: string;
        accuracy: string;
      }>;
    }>('/api/map/coordinates-batch', {
      properties: propertyAddresses
    });

    // Mapear coordenadas de volta para as propriedades
    const coordinatesMap = new Map(
      response.coordinates.map(coord => [coord.propertyId, coord])
    );

    const mapProperties: MapProperty[] = [];

    for (const property of properties) {
      const coords = coordinatesMap.get(property.id);
      
      if (coords) {
        mapProperties.push({
          id: property.id,
          title: property.title || 'Propriedade sem título',
          price: property.price,
          formattedPrice: formatPrice(property.price),
          address: property.address,
          city: property.city,
          county: property.county,
          propertyType: property.type,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          imageUrl: property.imageUrl,
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy
        });
      }
    }

    const bounds = calculateBounds(mapProperties);

    logger.info(
      `Coordenadas obtidas: ${mapProperties.length}/${properties.length} propriedades`, 
      'MAP_SERVICE'
    );

    return {
      properties: mapProperties,
      bounds,
      totalProcessed: properties.length,
      totalWithCoordinates: mapProperties.length
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao obter coordenadas: ${errorMsg}`, 'MAP_SERVICE', error as Error);
    
    // Em caso de erro, retornar dados vazios mas não falhar
    return {
      properties: [],
      bounds: null,
      totalProcessed: properties.length,
      totalWithCoordinates: 0
    };
  }
}

/**
 * Obter coordenadas para uma propriedade específica
 */
export async function getPropertyCoordinates(property: Property): Promise<PropertyCoordinates | null> {
  logger.info(`Obtendo coordenadas para propriedade ${property.id}`, 'MAP_SERVICE');

  try {
    const response = await apiClient.post<{
      latitude: number;
      longitude: number;
      formattedAddress: string;
      accuracy: string;
    }>('/api/map/coordinates', {
      propertyId: property.id,
      address: property.address,
      city: property.city,
      county: property.county,
      state: property.state
    });

    return {
      propertyId: property.id,
      latitude: response.latitude,
      longitude: response.longitude,
      address: response.formattedAddress,
      accuracy: response.accuracy as 'HIGH' | 'MEDIUM' | 'LOW'
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error(`Erro ao obter coordenadas da propriedade ${property.id}: ${errorMsg}`, 'MAP_SERVICE', error as Error);
    return null;
  }
}

// Utilitários
function formatPrice(price: number | null): string {
  if (!price) return 'Preço sob consulta';
  
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
}

function calculateBounds(properties: MapProperty[]): MapBounds | null {
  if (!properties.length) return null;

  const latitudes = properties.map(p => p.latitude);
  const longitudes = properties.map(p => p.longitude);

  return {
    north: Math.max(...latitudes),
    south: Math.min(...latitudes),
    east: Math.max(...longitudes),
    west: Math.min(...longitudes)
  };
}

// Cache simples para coordenadas (para evitar re-requests na mesma sessão)
const coordinatesCache = new Map<string, PropertyCoordinates>();

export function getCachedCoordinates(propertyId: string): PropertyCoordinates | null {
  return coordinatesCache.get(propertyId) || null;
}

export function setCachedCoordinates(coordinates: PropertyCoordinates): void {
  coordinatesCache.set(coordinates.propertyId, coordinates);
}

export function clearCoordinatesCache(): void {
  coordinatesCache.clear();
}

// Utils para debug/development
export const mapServiceUtils = {
  /**
   * Simular coordenadas para desenvolvimento (quando API do Google não está disponível)
   */
  generateMockCoordinates: (properties: Property[]): MapDataResponse => {
    // Coordenadas base de Portugal
    const baseLatitude = 39.5;
    const baseLongitude = -8.0;
    
    const mapProperties = properties.map((property) => ({
      id: property.id,
      title: property.title || 'Propriedade sem título',
      price: property.price,
      formattedPrice: formatPrice(property.price),
      address: property.address,
      city: property.city,
      county: property.county,
      propertyType: property.type,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      imageUrl: property.imageUrl,
      latitude: baseLatitude + (Math.random() - 0.5) * 2, // Variação de ±1 grau
      longitude: baseLongitude + (Math.random() - 0.5) * 2,
      accuracy: 'MEDIUM'
    }));

    return {
      properties: mapProperties,
      bounds: calculateBounds(mapProperties),
      totalProcessed: properties.length,
      totalWithCoordinates: mapProperties.length
    };
  },

  /**
   * Verificar se uma propriedade tem endereço suficiente para geocoding
   */
  hasValidAddress: (property: Property): boolean => {
    return !!(property.city || property.county || property.address);
  },

  /**
   * Estimar qualidade do endereço para geocoding
   */
  estimateAddressQuality: (property: Property): 'HIGH' | 'MEDIUM' | 'LOW' => {
    if (property.address && property.city) return 'HIGH';
    if (property.city || property.county) return 'MEDIUM';
    return 'LOW';
  }
};

// Log de inicialização apenas em desenvolvimento
if (import.meta.env.DEV) {
  logger.info('Map Service carregado', 'MAP_SERVICE');
}