import React, { useMemo } from 'react';
import { PropertyCard } from './PropertyCard';
import { AISearchProcessor } from './AISearchProcessor'
import type { SearchFilters } from '../App';
import type { Property } from "../types/property";
import { Badge } from './ui/badge';
import { Loader2, Sparkles } from 'lucide-react';

interface PropertyGridProps {
    aiResponse: string; 
    properties: Property[];
    isLoading?: boolean;
    error?: string | null;

    // apenas filtros manuais
    filters: SearchFilters;

    // se true, aplica os filtros no cliente; se false, assume que o backend já filtrou
    applyClientFilters?: boolean;

    onPropertySelect: (property: Property) => void;
    onFiltersUpdate: (filters: Partial<SearchFilters>) => void;
}

export function PropertyGrid({
    aiResponse,
    properties,
    isLoading = false,
    error = null,
    filters,
    applyClientFilters = false,
    onPropertySelect,
}: PropertyGridProps) {

    const filtered = useMemo(() => {
        const src = Array.isArray(properties) ? properties : []; // <-- SEMPRE array

        if (!applyClientFilters) return properties;

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
                    // se tiver area
                    return b.area - a.area;
                case 'date':
                    // se existir createdAt, substitua aqui:
                    // return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    return 0;
                default:
                    return 0;
            }
        });

        return result;
    }, [properties, filters, applyClientFilters]);

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
                <p className="text-red-600 mb-2">{error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="text-sm text-red-500 hover:text-red-700 underline"
                >
                    Tentar novamente
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            <AISearchProcessor aiResponse={aiResponse}
                               isLoading={isLoading} />

            {/* Header de resultados */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-medium">
                        {filtered.length} {filtered.length === 1 ? 'Propriedade Encontrada' : 'Propriedades Encontradas'}
                    </h2>
                    {applyClientFilters && (
                        <Badge className="border border-gray-300 bg-white text-gray-700">
                            Filtros Locais
                        </Badge>
                    )}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filtered.map((property) => (
                    <div key={property.id} className="relative">
                        <PropertyCard property={property} onClick={() => onPropertySelect(property)} />
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-gray-600 mb-2">Nenhuma propriedade corresponde aos seus critérios</p>
                    <p className="text-sm text-gray-500">Ajuste os filtros à esquerda</p>
                </div>
            )}
        </div>
    );
}
