import React, { useState } from 'react';
import { type Property } from '../types/property';
import { PropertyCard } from './PropertyCard';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, Bell, Sparkles, Filter, Calendar, MapPin, TrendingUp } from 'lucide-react';
import { type PropertyAlert } from '../types/PersonalArea';
import { formatDate, formatPrice, getPropertyTypeLabel } from '../utils/PersonalArea';

interface AlertResultsProps {
  alert: PropertyAlert;
  properties: Property[];
  onBack: () => void;
  onPropertySelect: (property: Property) => void;
}

export function AlertResults({ alert, properties, onBack, onPropertySelect }: AlertResultsProps) {
  const [sortBy, setSortBy] = useState<'newest' | 'price' | 'relevance'>('newest');

  // Sort properties based on selection
  const sortedProperties = [...properties].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.price - b.price;
      case 'relevance':
        // Mock relevance score based on how well it matches alert criteria
        return Math.random() - 0.5;
      case 'newest':
      default:
        return Math.random() - 0.5; // Mock date sorting
    }
  });

  return (
    <div className="space-y-6">
      {/* Header with Back Navigation */}
      <div className="flex items-center space-x-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onBack}
          className="border-pale-clay-deep hover:bg-pale-clay-light"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar aos Alertas
        </Button>
        
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-burnt-peach-lighter rounded-lg flex items-center justify-center border border-burnt-peach-light">
              <Bell className="h-5 w-5 text-burnt-peach-dark" />
            </div>
            <div>
              <h1 className="text-xl font-medium text-foreground">{alert.name}</h1>
              <p className="text-sm text-muted-foreground">
                Resultados do alerta criado em {formatDate(alert.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Criteria Summary */}
      <Card className="border border-burnt-peach-light bg-burnt-peach-lighter/5 shadow-clay-soft">
        <CardContent className="p-5">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-4 w-4 text-burnt-peach" />
            <h3 className="font-medium text-foreground">Critérios do Alerta</h3>
            <Badge className="bg-burnt-peach text-pure-white border-0">
              <Sparkles className="h-3 w-3 mr-1" />
              Match Inteligente
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-pure-white text-burnt-peach border border-burnt-peach-light">
              <MapPin className="h-3 w-3 mr-1" />
              {alert.location}
            </Badge>
            <Badge className="bg-pure-white text-burnt-peach border border-burnt-peach-light">
              🏠 {getPropertyTypeLabel(alert.propertyType)}
            </Badge>
            {alert.bedrooms && (
              <Badge className="bg-pure-white text-burnt-peach border border-burnt-peach-light">
                🛏️ {alert.bedrooms}+ quartos
              </Badge>
            )}
            {alert.bathrooms && (
              <Badge className="bg-pure-white text-burnt-peach border border-burnt-peach-light">
                🚿 {alert.bathrooms}+ banheiros
              </Badge>
            )}
            <Badge className="bg-pure-white text-burnt-peach border border-burnt-peach-light">
              💰 {formatPrice(alert.priceRange[0])} - {formatPrice(alert.priceRange[1])}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Results Header with Sorting */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-medium text-foreground">
            {properties.length} {properties.length === 1 ? 'Propriedade Encontrada' : 'Propriedades Encontradas'}
          </h2>
          <Badge className="bg-success-gentle text-pure-white border-0">
            <Bell className="h-3 w-3 mr-1" />
            Via Alerta
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Ordenar por:</span>
          <div className="flex space-x-1">
            {['newest', 'price', 'relevance'].map((option) => (
              <Button
                key={option}
                variant={sortBy === option ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(option as any)}
                className={
                  sortBy === option 
                    ? 'bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white' 
                    : 'border-pale-clay-deep hover:bg-pale-clay-light'
                }
              >
                {option === 'newest' && <Calendar className="h-3 w-3 mr-1" />}
                {option === 'price' && <span className="mr-1">💰</span>}
                {option === 'relevance' && <TrendingUp className="h-3 w-3 mr-1" />}
                {option === 'newest' ? 'Mais Recentes' : 
                 option === 'price' ? 'Preço' : 'Relevância'}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Properties Grid */}
      {properties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedProperties.map((property, index) => (
            <div key={property.id} className="relative">
              <PropertyCard
                property={property}
                onClick={() => onPropertySelect(property)}
                isWhiteBackground={false}
              />
              
              {/* Alert Badge Overlay */}
              <div className="absolute top-3 left-3 z-10">
                <Badge className="bg-success-gentle text-pure-white border-0 shadow-clay-medium font-semibold">
                  <Bell className="h-3 w-3 mr-1" />
                  Via Alerta
                </Badge>
              </div>
              
              {/* New Badge for recent matches */}
              {index < alert.newMatches && (
                <div className="absolute top-3 right-3 z-10">
                  <Badge className="bg-burnt-peach text-pure-white border-0 shadow-clay-medium font-semibold animate-pulse">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Nova
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-soft">
          <CardContent className="p-12 text-center">
            <Bell className="h-16 w-16 text-pale-clay-deep mx-auto mb-4" />
            <h3 className="font-medium text-foreground mb-2">
              Nenhuma propriedade encontrada
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Ainda não encontramos propriedades que correspondem aos critérios deste alerta. 
              Continue monitorando - notificaremos você assim que algo aparecer!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats Footer */}
      <Card className="border border-pale-clay-deep bg-porcelain-soft shadow-clay-soft">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <span className="text-muted-foreground">
                Total de propriedades: <strong className="text-foreground">{alert.matchCount}</strong>
              </span>
              <span className="text-muted-foreground">
                Novas: <strong className="text-burnt-peach">{alert.newMatches}</strong>
              </span>
            </div>
            {alert.lastTriggered && (
              <span className="text-muted-foreground">
                Última atualização: {formatDate(alert.lastTriggered)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}