import React, { useState, useEffect, useMemo } from 'react';
import { PropertyCard } from './PropertyCard';
import { AISearchProcessor } from './AISearchProcessor';
import { apiService, type PropertyDto } from '../services/api';
import type { Property, SearchFilters } from '../App'
import { Badge } from './ui/badge';
import { Sparkles, TrendingUp, Loader2 } from 'lucide-react';

interface PropertyGridProps {
    filters: SearchFilters;
    searchQuery: string;
    onPropertySelect: (property: Property) => void;
    onFiltersUpdate: (filters: Partial<SearchFilters>) => void;
}

// Convert backend DTO to frontend Property type
const mapPropertyDtoToProperty = (dto: PropertyDto): Property => ({
    id: dto.id,
    title: dto.title,
    price: dto.price,
    bedrooms: dto.bedrooms,
    bathrooms: dto.bathrooms,
    sqft: dto.area,
    location: dto.location,
    address: dto.address,
    images: dto.imageUrl ? [dto.imageUrl] : [],
    description: dto.description,
    features: dto.features || [],
    yearBuilt: dto.yearBuilt || new Date().getFullYear(),
    propertyType: dto.propertyType as 'house' | 'apartment' | 'condo' | 'townhouse',
    listingAgent: dto.listingAgent || {
        name: 'Agente Imobiliário',
        phone: '(11) 99999-9999',
        email: 'agente@imobiliaria.com'
    },
    aiRelevanceScore: dto.aiRelevanceScore
});

export function PropertyGrid({ filters, searchQuery, onPropertySelect, onFiltersUpdate }: PropertyGridProps) {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Effect to fetch properties when filters change
    useEffect(() => {
        const fetchProperties = async () => {
            setLoading(true);
            setError(null);

            try {
                const filtersDto = {
                    priceRange: filters.priceRange,
                    bedrooms: filters.bedrooms,
                    bathrooms: filters.bathrooms,
                    propertyType: filters.propertyType,
                    location: filters.location,
                    sortBy: filters.sortBy
                };

                const propertiesDto = await apiService.searchProperties(filtersDto);
                const mappedProperties = propertiesDto.map(mapPropertyDtoToProperty);
                setProperties(mappedProperties);
            } catch (err) {
                console.error('Error fetching properties:', err);
                setError('Erro ao carregar propriedades. Tente novamente.');
                setProperties([]);
            } finally {
                setLoading(false);
            }
        };

        fetchProperties();
    }, [filters]);

    const filteredAndRankedProperties = useMemo(() => {
        let filtered = properties;

        // Apply client-side search query filter if needed
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            filtered = filtered.filter(property => {
                const searchableText = `${property.title} ${property.description} ${property.location} ${property.features.join(' ')}`.toLowerCase();
                return searchableText.includes(searchLower);
            });
        }

        // Sort properties
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

        return filtered;
    }, [properties, searchQuery, filters.sortBy]);

    const hasAIRanking = searchQuery.trim().length > 0;

    if (loading) {
        return (
            <div className="space-y-6">
                <AISearchProcessor
                    searchQuery={searchQuery}
                    onFiltersUpdate={onFiltersUpdate}
                    onSearchQueryUpdate={() => { }}
                />

                <div className="flex items-center justify-center py-12">
                    <div className="flex items-center space-x-3">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
                        <span className="text-gray-600">Carregando propriedades...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <AISearchProcessor
                    searchQuery={searchQuery}
                    onFiltersUpdate={onFiltersUpdate}
                    onSearchQueryUpdate={() => { }}
                />

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
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* AI Search Processor */}
            <AISearchProcessor
                searchQuery={searchQuery}
                onFiltersUpdate={onFiltersUpdate}
                onSearchQueryUpdate={() => { }}
            />

            {/* Results Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-medium">
                        {filteredAndRankedProperties.length} {filteredAndRankedProperties.length === 1 ? 'Propriedade Encontrada' : 'Propriedades Encontradas'}
                    </h2>
                    {hasAIRanking && (
                        <Badge className="bg-gray-800 text-white border-0">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Ranking IA
                        </Badge>
                    )}
                </div>

                {hasAIRanking && (
                    <div className="flex items-center space-x-1 text-xs text-gray-600">
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
                    ${index === 0 ? 'bg-gray-800' : ''}
                    ${index === 1 ? 'bg-gray-600' : ''}
                    ${index === 2 ? 'bg-gray-500' : ''}
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

            {filteredAndRankedProperties.length === 0 && !loading && (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-gray-600 mb-2">Nenhuma propriedade corresponde aos seus critérios</p>
                    <p className="text-sm text-gray-500">Tente ajustar seus filtros ou termos de busca</p>
                    {searchQuery && (
                        <p className="text-sm text-gray-700 mt-2">
                            A IA pode sugerir filtros alternativos baseados na sua busca
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}