import { useMemo, useState } from 'react';
import { PropertyCard } from './PropertyCard';
import { type SearchFilters } from '../types/SearchFilters';
import { type Property } from '../types/property';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Sparkles, TrendingUp, Bookmark, BookmarkCheck } from 'lucide-react';
import { toast } from 'sonner';
import { createSavedSearch } from '../api/saved-searches.service';
import { type CreateSavedSearchRequest } from '../types/PersonalArea';
import apiClient from '../api/client';

interface PropertyGridProps {
  filters: SearchFilters;
  searchQuery: string;
  serverResults?: Property[];
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

export function PropertyGrid({ filters, searchQuery, serverResults, favorites = [], onToggleFavorite }: PropertyGridProps) {
  // State for save search dialog
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const filteredAndRankedProperties = useMemo(() => {
    // Use server results if available, otherwise fall back to empty array
    const source = serverResults || [];
    
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
        const searchableText = `${property.title || ''} ${property.description || ''} ${property.location || ''} ${(property.features || []).join(' ')}`.toLowerCase();
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
          case 'area':
            return (b.area || 0) - (a.area || 0);
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [filters, searchQuery, serverResults]);

  const isAuthenticated = apiClient.isAuthenticated();
  const canSaveSearch = isAuthenticated && (searchQuery.trim() || filters.location || filters.propertyType !== 'any' || filters.bedrooms || filters.bathrooms);

  // Generate search name suggestion
  const generateSearchName = (): string => {
    const parts: string[] = [];
    
    if (searchQuery.trim()) {
      // Take first 3 words from search query
      const queryWords = searchQuery.trim().split(' ').slice(0, 3).join(' ');
      parts.push(queryWords);
    }
    
    if (filters.location) {
      parts.push(`em ${filters.location}`);
    }
    
    if (filters.propertyType && filters.propertyType !== 'any') {
      const typeLabels: Record<string, string> = {
        house: 'Casas',
        apartment: 'Apartamentos', 
        condo: 'Condomínios',
        townhouse: 'Sobrados'
      };
      parts.push(typeLabels[filters.propertyType] || filters.propertyType);
    }
    
    if (filters.bedrooms) {
      parts.push(`${filters.bedrooms}+ quartos`);
    }

    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 2000000) {
      parts.push(`€${filters.priceRange[0].toLocaleString()} - €${filters.priceRange[1].toLocaleString()}`);
    }
    
    return parts.join(' ') || 'Minha Pesquisa';
  };

  const handleSaveSearch = async () => {
    if (!saveSearchName.trim()) {
      toast.error('Por favor, digite um nome para a pesquisa');
      return;
    }

    setIsSaving(true);
    
    try {
      const searchData: CreateSavedSearchRequest = {
        name: saveSearchName.trim(),
        query: searchQuery.trim(),
        filters: {
          location: filters.location || undefined,
          propertyType: filters.propertyType !== 'any' ? filters.propertyType : undefined,
          priceRange: filters.priceRange[0] > 0 || filters.priceRange[1] < 2000000 ? filters.priceRange : undefined,
          bedrooms: filters.bedrooms || undefined,
          bathrooms: filters.bathrooms || undefined
        }
      };

      await createSavedSearch(searchData);
      
      toast.success('Pesquisa guardada com sucesso!', {
        description: `"${saveSearchName}" foi adicionada às suas pesquisas guardadas.`
      });
      
      setIsSaveDialogOpen(false);
      setSaveSearchName('');
    } catch (error) {
      console.error('Erro ao guardar pesquisa:', error);
      toast.error('Erro ao guardar pesquisa', {
        description: 'Tente novamente em alguns instantes.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openSaveDialog = () => {
    setSaveSearchName(generateSearchName());
    setIsSaveDialogOpen(true);
  };

  const getSortingLabel = (): string => {
    switch (filters.sortBy) {
      case 'price':
        return 'Ordenado por preço (menor → maior)';
      case 'date':
        return 'Ordenado por data (mais recentes)';
      case 'area':
        return 'Ordenado por área (maior → menor)';
      case 'bedrooms':
        return 'Ordenado por quartos';
      case 'relevance':
        return 'Ordenado por relevância';
      default:
        return 'Ordenado por preço';
    }
  };

  return (
    <div className="space-y-6">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-xl font-medium text-foreground">
            {filteredAndRankedProperties.length} {filteredAndRankedProperties.length === 1 ? 'Propriedade Encontrada' : 'Propriedades Encontradas'}
          </h2>
        </div>
        
        <div className="flex items-center space-x-3">
          {filters.sortBy && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span>{getSortingLabel()}</span>
            </div>
          )}
          
          {canSaveSearch && (
            <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={openSaveDialog}
                  className="text-xs"
                >
                  <Bookmark className="h-3 w-3 mr-1" />
                  Guardar Pesquisa
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <BookmarkCheck className="h-4 w-4" />
                    <span>Guardar Pesquisa</span>
                  </DialogTitle>
                  <DialogDescription>
                    Guarde esta pesquisa para acompanhar novos resultados e receber notificações.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="searchName">Nome da pesquisa</Label>
                    <Input
                      id="searchName"
                      value={saveSearchName}
                      onChange={(e) => setSaveSearchName(e.target.value)}
                      placeholder="Ex: Apartamentos no Porto"
                      maxLength={100}
                    />
                  </div>
                  
                  <div className="bg-muted p-3 rounded-lg space-y-1 text-sm">
                    <p className="font-medium text-foreground">Critérios da pesquisa:</p>
                    {searchQuery && (
                      <p className="text-muted-foreground">• Termo: "{searchQuery}"</p>
                    )}
                    {filters.location && (
                      <p className="text-muted-foreground">• Localização: {filters.location}</p>
                    )}
                    {filters.propertyType && filters.propertyType !== 'any' && (
                      <p className="text-muted-foreground">• Tipo: {filters.propertyType}</p>
                    )}
                    {filters.bedrooms && (
                      <p className="text-muted-foreground">• Quartos: {filters.bedrooms}+</p>
                    )}
                    {filters.bathrooms && (
                      <p className="text-muted-foreground">• Casas de banho: {filters.bathrooms}+</p>
                    )}
                    {(filters.priceRange[0] > 0 || filters.priceRange[1] < 2000000) && (
                      <p className="text-muted-foreground">
                        • Preço: €{filters.priceRange[0].toLocaleString()} - €{filters.priceRange[1].toLocaleString()}
                      </p>
                    )}
                    <p className="text-muted-foreground">• Resultados atuais: {filteredAndRankedProperties.length}</p>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsSaveDialogOpen(false)}
                    disabled={isSaving}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveSearch}
                    disabled={isSaving || !saveSearchName.trim()}
                  >
                    {isSaving ? 'A guardar...' : 'Guardar Pesquisa'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      
      {/* Properties List */}
      <div className="space-y-4">
        {filteredAndRankedProperties.map((property) => (
          <div key={property.id} className="relative">
            <PropertyCard
              property={property}
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
