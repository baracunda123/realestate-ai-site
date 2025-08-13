import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  X,
  Heart,
  Share2,
  MapPin,
  Bed,
  Bath,
  Square,
  Calendar,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Play
} from 'lucide-react';
import type { Property } from "../types/property";
import { ImageWithFallback } from './figma/ImageWithFallback';

interface PropertyModalProps {
  property: Property;
  onClose: () => void;
}

export function PropertyModal({ property, onClose }: PropertyModalProps) {
  // Normalizações defensivas (não assumimos que o backend enviou tudo)
  const images: string[] = Array.isArray(property.images)
    ? property.images
    : ((property as any).imageUrl ? [(property as any).imageUrl] : []);

  const features: string[] = Array.isArray(property.features) ? property.features : [];

  const listingAgent = property.listingAgent ?? {
    name: 'Agente',
    phone: '',
    email: ''
  };

  const rawType: string =
    (property as any).propertyType ||
    (property as any).type ||
    'property';

  const propertyTypeLabel = typeof rawType === 'string' && rawType.length
    ? rawType.charAt(0).toUpperCase() + rawType.slice(1)
    : 'Property';

  const safeBedrooms = typeof property.bedrooms === 'number' ? property.bedrooms : 0;
  const safeBathrooms = typeof property.bathrooms === 'number' ? property.bathrooms : 0;
  const safeArea = typeof property.area === 'number' ? property.area : 0;
  const safeYearBuilt = (property as any).yearBuilt || '—';

  const pricePerM2 = safeArea > 0 && typeof property.price === 'number'
    ? Math.round(property.price / safeArea)
    : null;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price)) return '—';
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const nextImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex(i => (i + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images.length > 1) {
      setCurrentImageIndex(i => (i - 1 + images.length) % images.length);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
            <DialogHeader className="flex flex-row items-center justify-between p-4 border-b">
              <DialogTitle className="text-xl">
                {property.title || 'Propriedade'}
              </DialogTitle>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 h-full">
              {/* Images */}
              <div className="relative bg-muted">
                {images.length > 0 ? (
                  <ImageWithFallback
                    src={images[currentImageIndex]}
                    alt={`${property.title || 'Propriedade'} - Imagem ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                    Sem imagens
                  </div>
                )}

                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                      onClick={prevImage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white"
                      onClick={nextImage}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-1">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                          onClick={() => setCurrentImageIndex(index)}
                        />
                      ))}
                    </div>
                  </>
                )}

                <Button
                  className="absolute top-4 left-4 bg-black/80 hover:bg-black text-white"
                  size="sm"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Virtual Tour
                </Button>
              </div>

              {/* Details */}
              <div className="p-6 space-y-6">
                {/* Price & basic */}
                <div>
                  <div className="text-3xl font-medium text-primary mb-2">
                    {formatPrice(property.price as number)}
                  </div>
                  {property.address && (
                    <div className="flex items-center text-muted-foreground mb-3">
                      <MapPin className="h-4 w-4 mr-1" />
                      {property.address}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center">
                      <Bed className="h-4 w-4 mr-1" />
                      {safeBedrooms} Quartos
                    </div>
                    <div className="flex items-center">
                      <Bath className="h-4 w-4 mr-1" />
                      {safeBathrooms} WC
                    </div>
                    <div className="flex items-center">
                      <Square className="h-4 w-4 mr-1" />
                      {safeArea || '—'} m²
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Construído {safeYearBuilt}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <h3 className="font-medium mb-2">Descrição</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {property.description || 'Sem descrição.'}
                  </p>
                </div>

                <Separator />

                {/* Features */}
                <div>
                  <h3 className="font-medium mb-3">Características</h3>
                  {features.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {features.map(f => (
                        <Badge key={f} variant="secondary">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Nenhuma característica listada.
                    </div>
                  )}
                </div>

                <Separator />

                {/* Type / price per m2 */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-muted-foreground">Tipo</span>
                    <div className="font-medium">{propertyTypeLabel}</div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Preço por m²</span>
                    <div className="font-medium">
                      {pricePerM2 !== null ? `€${pricePerM2}` : '—'}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Agent */}
                <div>
                  <h3 className="font-medium mb-3">Agente</h3>
                  <div className="space-y-2">
                    <div className="font-medium">{listingAgent.name}</div>
                    <div className="flex items-center space-x-4">
                      {listingAgent.phone && (
                        <Button variant="outline" size="sm">
                          <Phone className="h-3 w-3 mr-1" />
                          {listingAgent.phone}
                        </Button>
                      )}
                      {listingAgent.email && (
                        <Button variant="outline" size="sm">
                          <Mail className="h-3 w-3 mr-1" />
                          Email
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4">
                  <Button className="w-full">Agendar Visita</Button>
                  <Button variant="outline" className="w-full">Pedir Mais Info</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}