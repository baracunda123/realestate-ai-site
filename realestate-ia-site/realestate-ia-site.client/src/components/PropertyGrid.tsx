import { useMemo } from 'react';
import { PropertyCard } from './PropertyCard';
import { type SearchFilters } from '../types/SearchFilters';
import { type Property } from '../types/property';
import { Sparkles, TrendingUp } from 'lucide-react';

interface PropertyGridProps {
  filters: SearchFilters;
  searchQuery: string;
  serverResults?: Property[];
  onPropertySelect: (property: Property) => void;
  favorites?: Property[];
  onToggleFavorite?: (property: Property) => void;
}

// Calculate simple text relevance score for ranking
const calculateRelevanceScore = (property: Property, query: string): number => {
  let score = 0;
  
  const queryLower = query.toLowerCase();
  const searchableText = `${property.title || ''} ${property.description || ''} ${property.location || ''} ${(property.features || []).join(' ')}`.toLowerCase();
  
  // Exact phrase match gets highest score
  if (searchableText.includes(queryLower)) {
    score += 100;
  }
  
  // Individual word matches
  const words = queryLower.split(' ').filter(word => word.length > 2);
  words.forEach(word => {
    if (searchableText.includes(word)) {
      score += 20;
    }
    
    // Title matches get extra points
    if (property.title?.toLowerCase().includes(word)) {
      score += 10;
    }
    
    // Location matches get extra points
    if (property.location?.toLowerCase().includes(word)) {
      score += 15;
    }
  });

  return score;
};

export function PropertyGrid({ filters, searchQuery, serverResults, onPropertySelect, favorites = [], onToggleFavorite }: PropertyGridProps) {
  // Use server results if available, otherwise fall back to empty array since we removed the old properties endpoint
  const source = serverResults || [];
  
  const filteredAndRankedProperties = useMemo(() => {
    let filtered = source.filter(property => {
      // Price filter
      if (property.price && (property.price < filters.priceRange[0] || property.price > filters.priceRange[1])) {
        return false;
      }
      
      // Bedrooms filter
      if (filters.bedrooms && property.bedrooms && property.bedrooms < filters.bedrooms) {
        return false;
      }
      
      // Bathrooms filter
      if (filters.bathrooms && property.bathrooms && property.bathrooms < filters.bathrooms) {
        return false;
      }
      
      // Property type filter - handle both empty string and 'any' values
      const propType = property.propertyType || property.type;
      if (filters.propertyType && filters.propertyType !== 'any' && propType !== filters.propertyType) {
        return false;
      }
      
      // Location filter
      if (filters.location && property.location && property.address && 
          !property.location.toLowerCase().includes(filters.location.toLowerCase()) && 
          !property.address.toLowerCase().includes(filters.location.toLowerCase())) {
        return false;
      }
      
      // Search query filter (skip if using server-provided results)
      if (searchQuery && !serverResults) {
        const searchLower = searchQuery.toLowerCase();
        const searchableText = `${property.title} ${property.description} ${property.location} ${(property.features || []).join(' ')}`.toLowerCase();
        if (!searchableText.includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });

    // Text-based ranking if there's a search query and not using server results
    if (searchQuery.trim() && !serverResults) {
      filtered = filtered.map(property => ({
        ...property,
        aiRelevanceScore: calculateRelevanceScore(property, searchQuery)
      })).sort((a, b) => (b.aiRelevanceScore || 0) - (a.aiRelevanceScore || 0));
    } else {
      // Regular sorting
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case 'price':
            return (a.price || 0) - (b.price || 0);
          case 'date':
            return Math.random() - 0.5; // Mock random sorting for "newest"
          case 'size':
            return (b.area || 0) - (a.area || 0);
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [filters, searchQuery, serverResults]);

  const hasAIRanking = searchQuery.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-medium text-foreground">
            {filteredAndRankedProperties.length} {filteredAndRankedProperties.length === 1 ? 'Propriedade Encontrada' : 'Propriedades Encontradas'}
          </h2>
        </div>
        
        {hasAIRanking && (
          <div className="flex items-center space-x-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Ordenado por relevância</span>
          </div>
        )}
      </div>
      
      {/* Properties List */}
      <div className="space-y-4">
        {filteredAndRankedProperties.map((property, index) => (
          <div key={property.id} className="relative">
            <PropertyCard
              property={property}
              onClick={() => onPropertySelect(property)}
              isWhiteBackground={index < 3}
              isFavorite={favorites.some(f => f.id === property.id)}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        ))}
      </div>
      
      {filteredAndRankedProperties.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-pale-clay-light rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-cocoa-taupe" />
          </div>
          <p className="text-foreground mb-2">Nenhuma propriedade corresponde aos seus critérios</p>
          <p className="text-sm text-muted-foreground">Tente ajustar os seus filtros ou termos de procura</p>
          {searchQuery && (
            <p className="text-sm text-burnt-peach mt-2">
              Experimente procurar por características específicas como localização ou tipo de imóvel
            </p>
          )}
        </div>
      )}
    </div>
  );
}
