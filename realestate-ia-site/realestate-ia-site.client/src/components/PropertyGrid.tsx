import React, { useMemo } from 'react';
import { PropertyCard } from './PropertyCard';
import { AISearchProcessor } from './AISearchProcessor';
import { AISearchEngine } from './AISearchEngine';
import type { Property, SearchFilters } from '../App';
import { Badge } from './ui/badge';
import { Sparkles, TrendingUp } from 'lucide-react';

// Mock property data
const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Loft Moderno no Centro',
    price: 850000,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1200,
    location: 'Centro de São Paulo',
    address: '123 Rua Augusta, São Paulo, SP 01234-567',
    images: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1562663474-6cbb3eaa4d14?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop'
    ],
    description: 'Loft moderno com janelas do chão ao teto e vista da cidade. Recentemente renovado com acabamentos de alta qualidade.',
    features: ['Vista da Cidade', 'Cozinha Moderna', 'Piso de Madeira', 'Lavanderia', 'Garagem'],
    yearBuilt: 2018,
    propertyType: 'apartment',
    listingAgent: {
      name: 'Sarah Silva',
      phone: '(11) 99999-0123',
      email: 'sarah@imobiliaria.com'
    }
  },
  {
    id: '2',
    title: 'Casa Vitoriana Charmosa',
    price: 1200000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2400,
    location: 'Vila Madalena',
    address: '456 Rua Harmonia, São Paulo, SP 05435-000',
    images: [
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop'
    ],
    description: 'Linda casa vitoriana com caráter original e atualizações modernas. Grande quintal perfeito para entretenimento.',
    features: ['Piso de Madeira Original', 'Cozinha Atualizada', 'Jardim', 'Lareira', 'Charme Histórico'],
    yearBuilt: 1925,
    propertyType: 'house',
    listingAgent: {
      name: 'Miguel Santos',
      phone: '(11) 99999-0456',
      email: 'miguel@imobiliaria.com'
    }
  },
  {
    id: '3',
    title: 'Cobertura de Luxo com Vista',
    price: 1800000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1800,
    location: 'Jardins',
    address: '789 Rua Oscar Freire, São Paulo, SP 01426-001',
    images: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop'
    ],
    description: 'Cobertura de luxo com vista panorâmica. Amenidades premium do prédio e serviço de concierge.',
    features: ['Vista Panorâmica', 'Concierge', 'Academia', 'Piscina', 'Varanda'],
    yearBuilt: 2020,
    propertyType: 'condo',
    listingAgent: {
      name: 'Emily Rodriguez',
      phone: '(11) 99999-0789',
      email: 'emily@imobiliaria.com'
    }
  },
  {
    id: '4',
    title: 'Sobrado Aconchegante',
    price: 750000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1500,
    location: 'Moema',
    address: '321 Rua Iraí, São Paulo, SP 04082-000',
    images: [
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&h=600&fit=crop'
    ],
    description: 'Sobrado charmoso em bairro tranquilo. Perfeito para compradores de primeira viagem ou quem quer diminuir de tamanho.',
    features: ['Varanda Coberta', 'Cozinha Atualizada', 'Quintal Fechado', 'Perto do Metrô', 'Detalhes Originais'],
    yearBuilt: 1920,
    propertyType: 'house',
    listingAgent: {
      name: 'David Kim',
      phone: '(11) 99999-0321',
      email: 'david@imobiliaria.com'
    }
  },
  {
    id: '5',
    title: 'Apartamento Moderno',
    price: 950000,
    bedrooms: 3,
    bathrooms: 2.5,
    sqft: 1600,
    location: 'Pinheiros',
    address: '654 Rua Teodoro Sampaio, São Paulo, SP 05405-000',
    images: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600607687644-aac4c3eac7f4?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&h=600&fit=crop'
    ],
    description: 'Apartamento contemporâneo em corredor tecnológico. Distância para caminhar dos escritórios da Amazon e Google.',
    features: ['Terraço', 'Casa Inteligente', 'Garagem', 'Design Moderno', 'Bairro Tech'],
    yearBuilt: 2019,
    propertyType: 'townhouse',
    listingAgent: {
      name: 'Lisa Park',
      phone: '(11) 99999-0654',
      email: 'lisa@imobiliaria.com'
    }
  },
  {
    id: '6',
    title: 'Casa Familiar Espaçosa',
    price: 1350000,
    bedrooms: 5,
    bathrooms: 4,
    sqft: 3200,
    location: 'Brooklin',
    address: '987 Rua Engenheiro Luis Carlos Berrini, São Paulo, SP 04571-000',
    images: [
      'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1600566752734-eb55ef6c8e19?w=800&h=600&fit=crop'
    ],
    description: 'Casa familiar espaçosa com grande quintal e atualizada por toda parte. Perfeita para famílias em crescimento.',
    features: ['Quintal Grande', 'Sala Familiar', 'Escritório', 'Banheiros Atualizados', 'Rua Tranquila'],
    yearBuilt: 2005,
    propertyType: 'house',
    listingAgent: {
      name: 'Roberto Taylor',
      phone: '(11) 99999-0987',
      email: 'roberto@imobiliaria.com'
    }
  }
];

interface PropertyGridProps {
  filters: SearchFilters;
  searchQuery: string;
  onPropertySelect: (property: Property) => void;
  onFiltersUpdate: (filters: Partial<SearchFilters>) => void;
}

// Calculate AI relevance score for ranking - moved before useMemo
const calculateAIRelevanceScore = (property: Property, aiResult: any, query: string): number => {
  let score = 0;
  
  // Base score for query match
  const queryLower = query.toLowerCase();
  const searchableText = `${property.title} ${property.description} ${property.location} ${property.features.join(' ')}`.toLowerCase();
  
  // Text relevance
  const words = queryLower.split(' ');
  words.forEach(word => {
    if (word.length > 2 && searchableText.includes(word)) {
      score += 10;
    }
  });

  // AI extracted criteria matching
  if (aiResult.extractedFilters.propertyType === property.propertyType) {
    score += 50;
  }

  if (aiResult.extractedFilters.bedrooms === property.bedrooms) {
    score += 30;
  }

  if (aiResult.extractedFilters.bathrooms === property.bathrooms) {
    score += 20;
  }

  if (aiResult.extractedFilters.location && 
      property.location.toLowerCase().includes(aiResult.extractedFilters.location.toLowerCase())) {
    score += 40;
  }

  // Feature matching
  if (aiResult.extractedFilters.features) {
    aiResult.extractedFilters.features.forEach((feature: string) => {
      if (property.features.some(pf => pf.toLowerCase().includes(feature.toLowerCase()))) {
        score += 15;
      }
    });
  }

  // Price range matching
  if (aiResult.extractedFilters.priceRange) {
    const [min, max] = aiResult.extractedFilters.priceRange;
    if (property.price >= min && property.price <= max) {
      score += 25;
    }
  }

  return score;
};

export function PropertyGrid({ filters, searchQuery, onPropertySelect, onFiltersUpdate }: PropertyGridProps) {
  const filteredAndRankedProperties = useMemo(() => {
    let filtered = mockProperties.filter(property => {
      // Price filter
      if (property.price < filters.priceRange[0] || property.price > filters.priceRange[1]) {
        return false;
      }
      
      // Bedrooms filter
      if (filters.bedrooms && property.bedrooms < filters.bedrooms) {
        return false;
      }
      
      // Bathrooms filter
      if (filters.bathrooms && property.bathrooms < filters.bathrooms) {
        return false;
      }
      
      // Property type filter - handle both empty string and 'any' values
      if (filters.propertyType && filters.propertyType !== 'any' && property.propertyType !== filters.propertyType) {
        return false;
      }
      
      // Location filter
      if (filters.location && !property.location.toLowerCase().includes(filters.location.toLowerCase()) && !property.address.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
      
      // Search query filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const searchableText = `${property.title} ${property.description} ${property.location} ${property.features.join(' ')}`.toLowerCase();
        if (!searchableText.includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });

    // AI-based ranking if there's a search query
    if (searchQuery.trim()) {
      const aiResult = AISearchEngine.analyzeQuery(searchQuery);
      
      filtered = filtered.map(property => ({
        ...property,
        aiRelevanceScore: calculateAIRelevanceScore(property, aiResult, searchQuery)
      })).sort((a, b) => (b.aiRelevanceScore || 0) - (a.aiRelevanceScore || 0));
    } else {
      // Regular sorting
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'price':
            return a.price - b.price;
          case 'date':
            return Math.random() - 0.5; // Mock random sorting for "newest"
          case 'size':
            return b.sqft - a.sqft;
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [filters, searchQuery]);

  const hasAIRanking = searchQuery.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* AI Search Processor */}
      <AISearchProcessor
        searchQuery={searchQuery}
        onFiltersUpdate={onFiltersUpdate}
        onSearchQueryUpdate={() => {}} // Handled by parent
      />

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-medium">
            {filteredAndRankedProperties.length} {filteredAndRankedProperties.length === 1 ? 'Propriedade Encontrada' : 'Propriedades Encontradas'}
          </h2>
          {hasAIRanking && (
            <Badge className="bg-gradient-to-r from-primary to-purple-600 text-white border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              Ranking IA
            </Badge>
          )}
        </div>
        
        {hasAIRanking && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Ordenado por relevância IA</span>
          </div>
        )}
      </div>
      
      {/* Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAndRankedProperties.map((property, index) => (
          <div key={property.id} className="relative">
            <PropertyCard
              property={property}
              onClick={() => onPropertySelect(property)}
            />
            {hasAIRanking && index < 3 && (
              <div className="absolute top-3 left-3 z-10">
                <Badge 
                  className={`
                    ${index === 0 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : ''}
                    ${index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' : ''}
                    ${index === 2 ? 'bg-gradient-to-r from-amber-600 to-orange-600' : ''}
                    text-white border-0 shadow-lg font-semibold
                  `}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  #{index + 1} Match IA
                </Badge>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {filteredAndRankedProperties.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-r from-primary to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground mb-2">Nenhuma propriedade corresponde aos seus critérios</p>
          <p className="text-sm text-muted-foreground">Tente ajustar seus filtros ou termos de busca</p>
          {searchQuery && (
            <p className="text-sm text-primary mt-2">
              A IA pode sugerir filtros alternativos baseados na sua busca
            </p>
          )}
        </div>
      )}
    </div>
  );
}