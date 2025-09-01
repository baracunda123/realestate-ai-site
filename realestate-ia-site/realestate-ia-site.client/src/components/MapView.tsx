import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { MapPin, Layers, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { type SearchFilters } from '../types/SearchFilters';
import { type Property } from '../types/property'; 

interface MapViewProps {
  filters: SearchFilters;
  searchQuery: string;
  onPropertySelect: (property: Property) => void;
}

export function MapView({ filters, searchQuery, onPropertySelect }: MapViewProps) {
  // Mock property locations for the map
  const mapProperties = [
    { id: '1', lat: 47.6062, lng: -122.3321, price: '$850K', title: 'Modern Downtown Loft' },
    { id: '2', lat: 47.6205, lng: -122.3212, price: '$1.2M', title: 'Charming Victorian Home' },
    { id: '3', lat: 47.6089, lng: -122.3300, price: '$1.8M', title: 'Luxury Waterfront Condo' },
    { id: '4', lat: 47.6513, lng: -122.3473, price: '$750K', title: 'Cozy Craftsman Bungalow' },
    { id: '5', lat: 47.6274, lng: -122.3432, price: '$950K', title: 'Modern Townhouse' },
    { id: '6', lat: 47.6681, lng: -122.3834, price: '$1.35M', title: 'Spacious Family Home' }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">Map View</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Layers className="h-4 w-4 mr-1" />
            Satellite
          </Button>
          <Button variant="outline" size="sm">
            <MapPin className="h-4 w-4 mr-1" />
            Draw Area
          </Button>
        </div>
      </div>

      <Card className="relative h-[600px] overflow-hidden">
        {/* Mock Map Background */}
        <div 
          className="absolute inset-0 bg-gradient-to-br from-blue-50 to-green-50"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 70%, rgba(34, 197, 94, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)
            `
          }}
        >
          {/* Mock Street Grid */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#94a3b8" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Property Markers */}
          {mapProperties.map((property, index) => (
            <div
              key={property.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
              style={{
                left: `${20 + (index % 3) * 25 + Math.sin(index) * 10}%`,
                top: `${20 + Math.floor(index / 3) * 30 + Math.cos(index) * 10}%`,
              }}
              onClick={() => {
                // Mock property selection - in real app would map to actual property
                console.log('Selected property:', property.title);
              }}
            >
              <div className="bg-primary text-primary-foreground px-2 py-1 rounded-lg shadow-lg text-xs font-medium group-hover:scale-110 transition-transform">
                {property.price}
              </div>
              <div className="w-3 h-3 bg-primary rounded-full mx-auto mt-1 group-hover:scale-125 transition-transform"></div>
            </div>
          ))}

          {/* Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <Button variant="secondary" size="sm" className="w-10 h-10 p-0">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" className="w-10 h-10 p-0">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" className="w-10 h-10 p-0">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Legend */}
          <Card className="absolute bottom-4 left-4 p-3">
            <CardContent className="p-0 space-y-2">
              <div className="text-sm font-medium">Price Range</div>
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Under $1M</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <span>$1M - $1.5M</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Over $1.5M</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Area Indicator */}
          <div className="absolute top-4 left-4">
            <Card className="p-2">
              <CardContent className="p-0">
                <div className="text-xs text-muted-foreground">Searching in</div>
                <div className="text-sm font-medium">Seattle, WA</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        Click on price markers to view property details. Use drawing tools to refine your search area.
      </div>
    </div>
  );
}