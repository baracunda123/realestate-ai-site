import React, { useMemo } from 'react';
import { PropertyCard } from './PropertyCard';
import { AISearchProcessor } from './AISearchProcessor'
import { WelcomeScreen } from './WelcomeScreen';
import type { SearchFilters } from '../App';
import type { Property } from "../types/property";
import { Badge } from './ui/badge';
import { Loader2, Sparkles, Search } from 'lucide-react';

interface PropertyGridProps {
    aiResponse: string; 
    properties: Property[];
    isLoading?: boolean;
    error?: string | null;
    searchQuery?: string;
    isFirstLoad?: boolean;

    // apenas filtros manuais
    filters: SearchFilters;

    // se true, aplica os filtros no cliente; se false, assume que o backend já filtrou
    applyClientFilters?: boolean;

    onPropertySelect: (property: Property) => void;
    onFiltersUpdate: (filters: Partial<SearchFilters>) => void;
    onStartSearch?: () => void;
    onExampleSearch?: (query: string) => void;
    user?: any;
}

// Constantes para valores padrão (devem coincidir com App.tsx)
const DEFAULT_FILTERS = {
    priceRange: [0, 100000000] as [number, number],
    bedrooms: null,
    bathrooms: null,
    propertyType: '',
    location: '',
    sortBy: 'price' as const
};

export function PropertyGrid({
    aiResponse,
    properties,
    isLoading = false,
    error = null,
    searchQuery = '',
    isFirstLoad = false,
    filters,
    applyClientFilters = false,
    onPropertySelect,
    onExampleSearch,
    user,
}: PropertyGridProps) {

    // Função para verificar se há filtros ativos
    const hasActiveFilters = useMemo(() => {
        if (!filters) return false;
        
        // Verifica se algum filtro está realmente aplicado (diferente dos valores padrão)
        const hasCustomPriceRange = filters.priceRange && 
            (filters.priceRange[0] !== DEFAULT_FILTERS.priceRange[0] || 
             filters.priceRange[1] !== DEFAULT_FILTERS.priceRange[1]);
        
        const hasBedroomsFilter = filters.bedrooms !== DEFAULT_FILTERS.bedrooms;
        const hasBathroomsFilter = filters.bathrooms !== DEFAULT_FILTERS.bathrooms;
        const hasPropertyTypeFilter = filters.propertyType !== DEFAULT_FILTERS.propertyType;
        const hasLocationFilter = filters.location !== DEFAULT_FILTERS.location;
        
        return hasCustomPriceRange || hasBedroomsFilter || hasBathroomsFilter || 
               hasPropertyTypeFilter || hasLocationFilter;
    }, [filters]);

    const filtered = useMemo(() => {
        const src = Array.isArray(properties) ? properties : [];

        if (!applyClientFilters) return src;

        let result = [...src];

        // Filtros manuais
        if (filters?.priceRange) {
            const [min, max] = filters.priceRange;
            result = result.filter(p => p.price >= min && p.price <= max);
        }
        if (filters?.bedrooms != null) {
            result = result.filter(p => p.bedrooms >= (filters.bedrooms ?? 0));
        }
        if (filters?.bathrooms != null) {
            result = result.filter(p => p.bathrooms >= (filters.bathrooms ?? 0));
        }
        if (filters?.propertyType) {
            result = result.filter(p => p.propertyType === filters.propertyType);
        }
        if (filters?.location?.trim()) {
            const loc = filters.location.toLowerCase();
            result = result.filter(p =>
                `${p.location} ${p.address ?? ''}`.toLowerCase().includes(loc)
            );
        }

        // Ordenação manual
        result.sort((a, b) => {
            switch (filters.sortBy) {
                case 'price':
                    return a.price - b.price;
                case 'size':
                    return b.area - a.area;
                case 'date':
                    return 0;
                default:
                    return 0;
            }
        });

        return result;
    }, [properties, filters, applyClientFilters]);

    // Se é a primeira vez e não há busca ativa, mostra welcome
    if (isFirstLoad && !searchQuery.trim() && !hasActiveFilters && !isLoading && !error) {
        return (
            <WelcomeScreen 
                onExampleSearch={onExampleSearch || (() => {})} 
                user={user}
            />
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
                    <span className="text-gray-600">Carregando propriedades...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-red-700 mb-2">Ops! Algo deu errado</h3>
                <p className="text-red-600 mb-4">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AISearchProcessor aiResponse={aiResponse} isLoading={isLoading} />

            {/* Header de resultados */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-medium">
                        {filtered.length} {filtered.length === 1 ? 'Propriedade Encontrada' : 'Propriedades Encontradas'}
                    </h2>
                    {applyClientFilters && hasActiveFilters && (
                        <Badge className="border border-gray-300 bg-white text-gray-700">
                            Filtros Locais
                        </Badge>
                    )}
                </div>
            </div>

            {/* Grid */}
            {filtered.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filtered.map((property) => (
                        <div key={property.id} className="relative">
                            <PropertyCard property={property} onClick={() => onPropertySelect(property)} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="h-8 w-8 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma propriedade encontrada</h3>
                    <p className="text-gray-600 mb-4">
                        {searchQuery.trim() 
                            ? `Não encontramos propriedades para "${searchQuery}"`
                            : "Nenhuma propriedade corresponde aos filtros selecionados"
                        }
                    </p>
                    <p className="text-sm text-gray-500">
                        Tente ajustar os filtros ou fazer uma nova busca
                    </p>
                </div>
            )}
        </div>
    );
}
