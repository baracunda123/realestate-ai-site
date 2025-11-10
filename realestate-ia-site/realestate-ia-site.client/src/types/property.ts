export interface Property {
  // Campos da BD (alinhados com Entity Property)
  id: string;
  title: string | null;
  description: string | null;
  type: string | null; // Alinhado com BD: 'house' | 'apartment' | 'condo' | 'townhouse' etc
  price: number | null;

  // Endereço - alinhado com BD
  address: string | null;
  city: string | null;
  state: string | null;
  county: string | null;
  civilParish: string | null;
  zipCode: string | null;

  // Características
  area: number | null;
  usableArea: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  garage: boolean;

  // URLs e links
  imageUrl: string | null;
  link: string | null;
  siteName: string | null; // Nome amigável do site (vem do backend via PropertySearchDto)

  // Timestamps
  createdAt: string; // ISO string da BD
  updatedAt: string; // ISO string da BD

  // Campos calculados/derivados para UI (não persistidos na BD)
  location?: string; // Combinação de city, county, state para exibição
  images?: string[]; // Array derivado de imageUrl
  features?: string[]; // Features calculadas (garage, etc.)
  yearBuilt?: number; // Calculado se necessário
  propertyType?: 'house' | 'apartment' | 'condo' | 'townhouse'; // Mapeamento de type
  listingAgent?: {
    name: string;
    phone: string;
    email: string;
  };
  aiRelevanceScore?: number; // Pontuação de IA

  // Price Change Info (calculado no backend)
  hadRecentPriceChange?: boolean;
  priceChangePercentage?: number; // Positivo = aumento, Negativo = redução
  lastPriceChangeDate?: string; // ISO string
  oldPrice?: number;
}
