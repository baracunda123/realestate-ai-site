import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { SearchFilters as SearchFiltersType } from '../App';
import { Filter, RotateCcw } from 'lucide-react';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  setFilters: (filters: SearchFiltersType) => void;
}

export function SearchFilters({ filters, setFilters }: SearchFiltersProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(price * 5.5); // Conversão mock para Real
  };

  const updateFilter = (key: keyof SearchFiltersType, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  return (
    <Card className="border-2 border-primary/10 bg-gradient-to-br from-white to-blue-50/30 shadow-lg">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
            <Filter className="h-3 w-3 text-white" />
          </div>
          <span className="text-gray-900">Filtros</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Price Range */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-gray-900">Faixa de Preço</Label>
          <Slider
            value={filters.priceRange}
            onValueChange={(value) => updateFilter('priceRange', value)}
            max={2000000}
            min={0}
            step={50000}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span className="font-medium text-primary">{formatPrice(filters.priceRange[0])}</span>
            <span className="font-medium text-primary">{formatPrice(filters.priceRange[1])}</span>
          </div>
        </div>

        {/* Property Type */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-900">Tipo de Propriedade</Label>
          <Select value={filters.propertyType || 'any'} onValueChange={(value) => updateFilter('propertyType', value === 'any' ? '' : value)}>
            <SelectTrigger className="border-2 border-gray-200 hover:border-primary/50 transition-colors">
              <SelectValue placeholder="Qualquer tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualquer tipo</SelectItem>
              <SelectItem value="house">Casa</SelectItem>
              <SelectItem value="apartment">Apartamento</SelectItem>
              <SelectItem value="condo">Condomínio</SelectItem>
              <SelectItem value="townhouse">Sobrado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bedrooms */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-900">Quartos</Label>
          <div className="grid grid-cols-5 gap-2">
            {[null, 1, 2, 3, 4].map((num) => (
              <Button
                key={num?.toString() || 'any'}
                variant={filters.bedrooms === num ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('bedrooms', num)}
                className={`h-9 transition-all duration-200 ${
                  filters.bedrooms === num 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md border-0' 
                    : 'border-2 border-gray-200 hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                {num ? `${num}+` : 'Todos'}
              </Button>
            ))}
          </div>
        </div>

        {/* Bathrooms */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-900">Banheiros</Label>
          <div className="grid grid-cols-5 gap-2">
            {[null, 1, 2, 3, 4].map((num) => (
              <Button
                key={num?.toString() || 'any'}
                variant={filters.bathrooms === num ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('bathrooms', num)}
                className={`h-9 transition-all duration-200 ${
                  filters.bathrooms === num 
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md border-0' 
                    : 'border-2 border-gray-200 hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                {num ? `${num}+` : 'Todos'}
              </Button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-900">Localização</Label>
          <Input
            placeholder="Digite cidade, bairro ou CEP"
            value={filters.location}
            onChange={(e) => updateFilter('location', e.target.value)}
            className="border-2 border-gray-200 hover:border-primary/50 focus:border-primary/50 transition-colors"
          />
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-900">Ordenar Por</Label>
          <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
            <SelectTrigger className="border-2 border-gray-200 hover:border-primary/50 transition-colors">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price">Preço: Menor para Maior</SelectItem>
              <SelectItem value="date">Anúncios Mais Recentes</SelectItem>
              <SelectItem value="size">Tamanho: Maior para Menor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset Filters */}
        <Button 
          variant="outline" 
          className="w-full bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 hover:border-primary/50 hover:from-primary/5 hover:to-primary/10 transition-all duration-200"
          onClick={() => setFilters({
            priceRange: [0, 2000000],
            bedrooms: null,
            bathrooms: null,
            propertyType: '',
            location: '',
            sortBy: 'price'
          })}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Limpar Filtros
        </Button>
      </CardContent>
    </Card>
  );
}