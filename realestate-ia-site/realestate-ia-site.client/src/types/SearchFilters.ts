// SearchFilters interface alinhada com capacidades da BD e API
import type { Property } from './property';

export interface SearchFilters {
  // Localiza��o - alinhado com campos da BD Property
  location: string;
  city?: string;
  county?: string;
  state?: string;
  civilParish?: string;
  zipCode?: string;
  
  // Pre�o
  priceRange: [number, number];
  priceMin?: number;
  priceMax?: number;
  
  // Caracter�sticas da propriedade
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string; // 'any' | 'house' | 'apartment' | 'condo' | 'townhouse'
  
  // �rea
  minArea?: number;
  maxArea?: number;
  minUsableArea?: number;
  maxUsableArea?: number;
  
  // Features
  hasGarage?: boolean;
  
  // Ordena��o
  sortBy: 'price' | 'area' | 'bedrooms' | 'date' | 'relevance';
  sortOrder?: 'asc' | 'desc';
  
  // Limites de resultados
  limit?: number;
  offset?: number;
}

// Para a API de pesquisa
export interface SearchRequest {
  // Query de texto livre
  query?: string;
  
  // Filtros estruturados
  filters?: Partial<SearchFilters>;
  
  // Pagina��o
  page?: number;
  pageSize?: number;
  
  // Incluir campos extras na resposta
  includeAiAnalysis?: boolean;
  includeMarketData?: boolean;
  includePriceHistory?: boolean;
}

// Response da API de pesquisa
export interface SearchResponse {
  properties: Property[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  
  // Resposta da IA
  aiResponse?: string;
  aiSummary?: string;
  
  // Dados de mercado
  marketInsights?: {
    averagePrice: number;
    priceRange: [number, number];
    totalListings: number;
    averageDaysOnMarket: number;
    priceHistory?: Array<{
      date: string;
      averagePrice: number;
    }>;
  };
  
  // Filtros aplicados (para debugging)
  appliedFilters?: SearchFilters;
  
  // Sugest�es de refinamento
  suggestions?: {
    locations: string[];
    priceRanges: Array<[number, number]>;
    propertyTypes: string[];
  };
}

// Para autocomplete e sugest�es
export interface LocationSuggestion {
  id: string;
  name: string;
  type: 'city' | 'county' | 'state' | 'civilParish';
  fullName: string;
  parentLocation?: string;
  propertyCount?: number;
}

export interface PropertyTypeSuggestion {
  value: string;
  label: string;
  count?: number;
  icon?: string;
}

// Filtros salvos
export interface SavedFilter {
  id: string;
  userId?: string;
  name: string;
  filters: SearchFilters;
  createdAt: Date;
  updatedAt?: Date;
  usageCount: number;
  lastUsed?: Date;
}

// Export para compatibilidade com c�digo existente
export type { SearchFilters as SearchFiltersType };

// Constantes para valores padr�o
export const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  location: '',
  priceRange: [0, 2000000],
  bedrooms: null,
  bathrooms: null,
  propertyType: 'any',
  sortBy: 'price',
  sortOrder: 'asc',
  limit: 20,
  offset: 0
};

export const PROPERTY_TYPES: PropertyTypeSuggestion[] = [
  { value: 'any', label: 'Qualquer Tipo', icon: '??' },
  { value: 'house', label: 'Casa', icon: '??' },
  { value: 'apartment', label: 'Apartamento', icon: '??' },
  { value: 'condo', label: 'Condom�nio', icon: '???' },
  { value: 'townhouse', label: 'Sobrado', icon: '??' }
];

export const SORT_OPTIONS = [
  { value: 'price', label: 'Pre�o' },
  { value: 'area', label: '�rea' },
  { value: 'bedrooms', label: 'Quartos' },
  { value: 'date', label: 'Data' },
  { value: 'relevance', label: 'Relev�ncia' }
] as const;