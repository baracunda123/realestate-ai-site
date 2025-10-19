import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { type SearchFilters as SearchFiltersType } from '../types/SearchFilters';
import { Filter, RotateCcw } from 'lucide-react';

interface SearchFiltersProps {
  filters: SearchFiltersType;
  setFilters: (filters: SearchFiltersType) => void;
}

export function SearchFilters({ filters, setFilters }: SearchFiltersProps) {
  const [manualPrices, setManualPrices] = useState({
    min: '',
    max: ''
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const parsePriceInput = (value: string) => {
    const parsed = parseInt(value.replace(/\D/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  const updateFilter = <K extends keyof SearchFiltersType>(key: K, value: SearchFiltersType[K]) => {
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
    
    // Validações
    const validMin = Math.max(0, Math.min(minPrice, 2000000));
    const validMax = Math.max(validMin, Math.min(maxPrice || 2000000, 2000000));
    
    updateFilter('priceRange', [validMin, validMax]);
  };

  const handleManualPriceKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyManualPrices();
    }
  };

  const resetManualPrices = () => {
    setManualPrices({ min: '', max: '' });
    updateFilter('priceRange', [0, 2000000]);
  };

  const handleResetFilters = () => {
    setFilters({
      priceRange: [0, 2000000],
      bedrooms: null,
      bathrooms: null,
      propertyType: '',
      location: '',
      sortBy: 'price'
    });
    setManualPrices({ min: '', max: '' });
  };

  return (
    <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-burnt-peach rounded-lg flex items-center justify-center shadow-burnt-peach">
            <Filter className="h-3 w-3 text-pure-white" />
          </div>
          <span className="text-deep-mocha font-semibold">Filtros</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Price Range */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold text-deep-mocha">Intervalo de Preços</Label>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="price-min" className="text-xs text-warm-taupe">Preço Mínimo</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-warm-taupe">€</span>
                <Input
                  id="price-min"
                  placeholder="0"
                  value={manualPrices.min}
                  onChange={(e) => handleManualPriceChange('min', e.target.value)}
                  onKeyPress={handleManualPriceKeyPress}
                  onBlur={applyManualPrices}
                  className="pl-8 bg-pure-white border border-pale-clay-deep text-deep-mocha placeholder:text-warm-taupe-light hover:border-burnt-peach focus:border-burnt-peach transition-colors text-sm"
                  aria-label="Preço mínimo"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="price-max" className="text-xs text-warm-taupe">Preço Máximo</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-warm-taupe">€</span>
                <Input
                  id="price-max"
                  placeholder="2.000.000"
                  value={manualPrices.max}
                  onChange={(e) => handleManualPriceChange('max', e.target.value)}
                  onKeyPress={handleManualPriceKeyPress}
                  onBlur={applyManualPrices}
                  className="pl-8 bg-pure-white border border-pale-clay-deep text-deep-mocha placeholder:text-warm-taupe-light hover:border-burnt-peach focus:border-burnt-peach transition-colors text-sm"
                  aria-label="Preço máximo"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={applyManualPrices}
              className="bg-burnt-peach hover:bg-burnt-peach-light text-deep-mocha font-semibold border-0 text-xs px-3 py-1 h-7 shadow-burnt-peach"
              aria-label="Aplicar preços"
            >
              Aplicar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={resetManualPrices}
              className="border border-pale-clay-deep bg-pure-white hover:bg-pale-clay-light text-warm-taupe text-xs px-3 py-1 h-7"
              aria-label="Limpar preços"
            >
              Limpar
            </Button>
          </div>

          {/* Current Range Display */}
          {filters.priceRange && (filters.priceRange[0] > 0 || filters.priceRange[1] < 2000000) && (
            <div className="bg-pale-clay-light border border-pale-clay-deep rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-warm-taupe">Intervalo atual:</span>
                <span className="font-medium text-burnt-peach-dark">
                  {formatPrice(filters.priceRange[0])} - {formatPrice(filters.priceRange[1])}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Property Type */}
        <div className="space-y-2">
          <Label htmlFor="property-type" className="text-sm font-semibold text-deep-mocha">Tipo de Propriedade</Label>
          <Select 
            value={filters.propertyType || 'any'} 
            onValueChange={(value) => updateFilter('propertyType', value === 'any' ? '' : value)}
          >
            <SelectTrigger 
              id="property-type"
              className="border border-pale-clay-deep bg-pure-white text-deep-mocha hover:border-burnt-peach transition-colors"
              aria-label="Tipo de propriedade"
            >
              <SelectValue placeholder="Qualquer tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Qualquer tipo</SelectItem>
              <SelectItem value="house">Casa</SelectItem>
              <SelectItem value="apartment">Apartamento</SelectItem>
              <SelectItem value="condo">Condomínio</SelectItem>
              <SelectItem value="townhouse">Moradia</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bedrooms */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-deep-mocha">Quartos</Label>
          <div className="grid grid-cols-5 gap-2">
            {[null, 1, 2, 3, 4].map((num) => (
              <Button
                key={num?.toString() || 'any'}
                variant={filters.bedrooms === num ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('bedrooms', num)}
                className={`h-9 transition-all duration-200 ${
                  filters.bedrooms === num 
                    ? 'bg-burnt-peach text-deep-mocha font-semibold shadow-burnt-peach border-0' 
                    : 'border border-pale-clay-deep bg-pure-white text-warm-taupe hover:border-burnt-peach hover:bg-pale-clay-light'
                }`}
                aria-label={num ? `${num} ou mais quartos` : 'Todos os quartos'}
                aria-pressed={filters.bedrooms === num}
              >
                {num ? `${num}+` : 'Todos'}
              </Button>
            ))}
          </div>
        </div>

        {/* Bathrooms */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-deep-mocha">Casas de Banho</Label>
          <div className="grid grid-cols-5 gap-2">
            {[null, 1, 2, 3, 4].map((num) => (
              <Button
                key={num?.toString() || 'any'}
                variant={filters.bathrooms === num ? 'default' : 'outline'}
                size="sm"
                onClick={() => updateFilter('bathrooms', num)}
                className={`h-9 transition-all duration-200 ${
                  filters.bathrooms === num 
                    ? 'bg-burnt-peach text-deep-mocha font-semibold shadow-burnt-peach border-0' 
                    : 'border border-pale-clay-deep bg-pure-white text-warm-taupe hover:border-burnt-peach hover:bg-pale-clay-light'
                }`}
                aria-label={num ? `${num} ou mais casas de banho` : 'Todas as casas de banho'}
                aria-pressed={filters.bathrooms === num}
              >
                {num ? `${num}+` : 'Todos'}
              </Button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-semibold text-deep-mocha">Localização</Label>
          <Input
            id="location"
            placeholder="Digite cidade, distrito ou código postal"
            value={filters.location || ''}
            onChange={(e) => updateFilter('location', e.target.value)}
            className="border border-pale-clay-deep bg-pure-white text-deep-mocha placeholder:text-warm-taupe-light hover:border-burnt-peach focus:border-burnt-peach transition-colors"
            aria-label="Localização"
          />
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <Label htmlFor="sort-by" className="text-sm font-semibold text-deep-mocha">Ordenar Por</Label>
          <Select 
            value={filters.sortBy || 'price'} 
            onValueChange={(value) => updateFilter('sortBy', value as SearchFiltersType['sortBy'])}
          >
            <SelectTrigger 
              id="sort-by"
              className="border border-pale-clay-deep bg-pure-white text-deep-mocha hover:border-burnt-peach transition-colors"
              aria-label="Ordenar por"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price">Preço: Menor para Maior</SelectItem>
              <SelectItem value="date">Anúncios Mais Recentes</SelectItem>
              <SelectItem value="area">Área: Maior para Menor</SelectItem>
              <SelectItem value="bedrooms">Número de Quartos</SelectItem>
              <SelectItem value="relevance">Relevância</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Reset Filters */}
        <Button 
          variant="outline" 
          className="w-full bg-pure-white border border-pale-clay-deep text-warm-taupe hover:border-burnt-peach hover:bg-pale-clay-light transition-all duration-200"
          onClick={handleResetFilters}
          aria-label="Limpar todos os filtros"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Limpar Filtros
        </Button>
      </CardContent>
    </Card>
  );
}