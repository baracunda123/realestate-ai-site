import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Heart, MapPin, Bed, Bath, Square, Calendar } from 'lucide-react';
import type { Property } from "../types/property";
import { ImageWithFallback } from './figma/ImageWithFallback';

interface PropertyCardProps {
  property: Property;
  onClick: () => void;
}

export function PropertyCard({ property, onClick }: PropertyCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price * 5.5); // Conversão mock para Real
  };

  const getPropertyTypeColor = (type: string) => {
    // Todas as cores neutras usando tons de gray
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getPropertyTypeName = (type: string) => {
    const names = {
      house: 'Casa',
      apartment: 'Apartamento',
      condo: 'Condomínio',
      townhouse: 'Sobrado'
    };
    return names[type as keyof typeof names] || type;
  };

    return (
        <Card
            className="overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer group border border-gray-200 hover:border-gray-300 bg-white"
            onClick={onClick}
        >
            <div className="relative">
                {property.images?.length ? (
                    <ImageWithFallback
                        src={property.images[0]}
                        alt={property.title || "Imagem do imóvel"}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-500 text-sm">
                        Sem imagem
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="absolute top-3 left-3">
                    <Badge className={`${getPropertyTypeColor(property.propertyType)} font-medium border shadow-sm`}>
                        {getPropertyTypeName(property.propertyType)}
                    </Badge>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-3 right-3 h-9 w-9 p-0 bg-white/90 hover:bg-white shadow-md backdrop-blur-sm hover:scale-105 transition-all duration-200"
                    onClick={(e) => {
                        e.stopPropagation();
                        // favorites...
                    }}
                >
                    <Heart className="h-4 w-4 text-gray-600 hover:text-gray-800 transition-all duration-200" />
                </Button>

                {/* Price overlay */}
                <div className="absolute bottom-3 right-3">
                    <div className="bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg border border-white/20">
                        <span className="text-sm font-semibold text-gray-800">
                            {formatPrice(property.price)}
                        </span>
                    </div>
                </div>
            </div>

            <CardContent className="p-5">
                <div className="space-y-4">
                    <div>
                        <h3 className="font-semibold line-clamp-1 text-lg text-gray-900">{property.title}</h3>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                            <MapPin className="h-3 w-3 mr-1 text-gray-500" />
                            {property.location}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                        {/* quartos */}
                        <div className="flex items-center space-x-1 text-gray-600">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Bed className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{property.bedrooms}</div>
                                <div className="text-xs text-gray-500">quartos</div>
                            </div>
                        </div>

                        {/* banheiros */}
                        <div className="flex items-center space-x-1 text-gray-600">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Bath className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{property.bathrooms}</div>
                                <div className="text-xs text-gray-500">banheiros</div>
                            </div>
                        </div>

                        {/* m² */}
                        <div className="flex items-center space-x-1 text-gray-600">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Square className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{property.area}</div>
                                <div className="text-xs text-gray-500">m²</div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        {property.yearBuilt ? (
                            <div className="flex items-center text-xs text-gray-500">
                                <Calendar className="h-3 w-3 mr-1" />
                                Construído em {property.yearBuilt}
                            </div>
                        ) : <span />}

                        <div className="text-sm text-gray-600">
                            {property.area > 0 ? `${Math.round((property.price * 5.5) / property.area)}/m²` : "—"}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                        {(property.features ?? []).slice(0, 3).map((feature) => (
                            <Badge key={feature} className="text-xs border bg-gray-50 text-gray-700 border-gray-200">
                                {feature}
                            </Badge>
                        ))}
                        {(property.features?.length ?? 0) > 3 && (
                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600 border-gray-200">
                                +{(property.features!.length) - 3} mais
                            </Badge>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}