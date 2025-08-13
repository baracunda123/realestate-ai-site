import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
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
  // Constantes alinhadas com App.tsx
  const DEFAULT_PRICE_RANGE: [number, number] = [0, 100000000];

  const [manualPrices, setManualPrices] = useState({
    min: '',
    max: ''
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price); // Já não precisa de conversão
  };

  const parsePriceInput = (value: string) => {
    const parsed = parseInt(value.replace(/\D/g, ''));
    return isNaN(parsed) ? 0 : parsed; // Remove a divisão por 5.5
  };

  const updateFilter = (key: keyof SearchFiltersType, value: any) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleManualPriceChange = (type: 'min' | 'max', value: string) => {
    // Remove caracteres não numéricos e formata
    const cleanValue = value.replace(/\D/g, '');
    setManualPrices(prev => ({
      ...prev,
      [type]: cleanValue
    }));
  };

  const applyManualPrices = () => {
    const minPrice = parsePriceInput(manualPrices.min);
    const maxPrice = parsePriceInput(manualPrices.max);
    
    // Validações usando a constante
    const validMin = Math.max(DEFAULT_PRICE_RANGE[0], Math.min(minPrice, DEFAULT_PRICE_RANGE[1]));
    const validMax = Math.max(validMin, Math.min(maxPrice || DEFAULT_PRICE_RANGE[1], DEFAULT_PRICE_RANGE[1]));
    
    updateFilter('priceRange', [validMin, validMax]);
  };

  const handleManualPriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyManualPrices();
    }
  };

  const resetManualPrices = () => {
    setManualPrices({ min: '', max: '' });
    updateFilter('priceRange', DEFAULT_PRICE_RANGE);
  };

  return (
    <Card className="border border-gray-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gray-600 rounded-lg flex items-center justify-center">
            <Filter className="h-3 w-3 text-white" />
          </div>
          <span className="text-gray-900">Filtros</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Price Range */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-gray-900">Faixa de Preço</Label>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Preço Mínimo</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">€</span>
                <Input
                  placeholder="0"
                  value={manualPrices.min}
                  onChange={(e) => handleManualPriceChange('min', e.target.value)}
                  onKeyDown={handleManualPriceKeyDown}
                  onBlur={applyManualPrices}
                  className="pl-8 border border-gray-200 hover:border-gray-300 focus:border-gray-400 transition-colors text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-600">Preço Máximo</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">€</span>
                <Input
                  placeholder="100.000.000"
                  value={manualPrices.max}
                  onChange={(e) => handleManualPriceChange('max', e.target.value)}
                  onKeyDown={handleManualPriceKeyDown}
                  onBlur={applyManualPrices}
                  className="pl-8 border border-gray-200 hover:border-gray-300 focus:border-gray-400 transition-colors text-sm"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={applyManualPrices}
              className="bg-gray-700 hover:bg-gray-800 text-white border-0 text-xs px-3 py-1 h-7"
            >
              Aplicar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetManualPrices}
              className="border border-gray-200 hover:bg-gray-50 text-xs px-3 py-1 h-7"
            >
              Resetar
            </Button>
          </div>

          {/* Current Range Display */}
          {(filters.priceRange[0] > DEFAULT_PRICE_RANGE[0] || 
            filters.priceRange[1] < DEFAULT_PRICE_RANGE[1]) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Faixa atual:</span>
                <span className="font-medium text-gray-800">
                  {formatPrice(filters.priceRange[0])} - {formatPrice(filters.priceRange[1])}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Property Type */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-900">Tipo de Propriedade</Label>
          <Select value={filters.propertyType || 'any'} onValueChange={(value) => updateFilter('propertyType', value === 'any' ? '' : value)}>
            <SelectTrigger className="border border-gray-200 hover:border-gray-300 transition-colors">
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
                    ? 'bg-gray-800 text-white shadow-sm border-0' 
                    : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                    ? 'bg-gray-800 text-white shadow-sm border-0' 
                    : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
            className="border border-gray-200 hover:border-gray-300 focus:border-gray-400 transition-colors"
          />
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-gray-900">Ordenar Por</Label>
          <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
            <SelectTrigger className="border border-gray-200 hover:border-gray-300 transition-colors">
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
          className="w-full bg-gray-50 border border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-all duration-200"
          onClick={() => {
            setFilters({
              priceRange: DEFAULT_PRICE_RANGE,
              bedrooms: null,
              bathrooms: null,
              propertyType: '',
              location: '',
              sortBy: 'price'
            });
            setManualPrices({ min: '', max: '' });
          }}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Limpar Filtros
        </Button>
      </CardContent>
    </Card>
  );
}