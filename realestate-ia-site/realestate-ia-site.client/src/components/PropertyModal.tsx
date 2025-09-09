import { useState } from 'react';
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
  Play,
  Home
} from 'lucide-react';
import { type Property } from '../types/property';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface PropertyModalProps {
  property: Property;
  onClose: () => void;
}

export function PropertyModal({ property, onClose }: PropertyModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatArea = (area: number) => {
    return new Intl.NumberFormat('pt-PT').format(area);
  };

  // Safe access to images array with fallback
  const images = property.images && property.images.length > 0 
    ? property.images 
    : undefined;

  const nextImage = () => {
    if (images) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (images) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  // Safe access to features array
  const features = property.features || [];

  // Safe property type formatting
  const formatPropertyType = (type: string | undefined) => {
    if (!type) return 'Não especificado';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] sm:min-w-[700px] md:min-w-[900px] h-[90vh] p-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl">{property.title}</DialogTitle>
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

        {/* Main content area */}
        <div className="flex-1 overflow-hidden">
          <div className="grid h-full grid-cols-[minmax(360px,1.3fr)_1fr] md:grid-cols-[minmax(420px,1.4fr)_1fr]">
            {/* Images */}
            <div className="relative bg-muted">
              {images ? (
                <>
                  <ImageWithFallback
                    src={images[currentImageIndex]}
                    alt={`${property.title} - Imagem ${currentImageIndex + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Image Navigation */}
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                        onClick={nextImage}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      
                      {/* Image Indicators */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-1">
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

                  {/* Virtual Tour Button */}
                  <Button
                    className="absolute top-4 left-4 bg-black/80 hover:bg-black text-white"
                    size="sm"
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Tour Virtual
                  </Button>
                </>
              ) : (
                // No images placeholder
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <div className="text-center">
                    <Square className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Sem imagens disponíveis</p>
                  </div>
                </div>
              )}
            </div>

            {/* Property Details with fixed scroll */}
            <div className="overflow-y-auto">
              <div className="p-6 space-y-6">
                {/* Price and Basic Info */}
                <div>
                  <div className="text-3xl font-bold text-gray-900">
                    {property.price ? formatPrice(property.price) : 'Preço não disponível'}
                  </div>
                  <div className="flex items-center text-muted-foreground mb-3">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.address}
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center">
                      <Bed className="h-4 w-4 mr-1" />
                      {property.bedrooms} Quartos
                    </div>
                    <div className="flex items-center">
                      <Bath className="h-4 w-4 mr-1" />
                      {property.bathrooms} Casas de banho
                    </div>
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {property.area ? `${formatArea(property.area)} m²` : 'Área não disponível'}
                      </span>
                    </div>
                    {property.yearBuilt && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Construído em {property.yearBuilt}
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Description */}
                <div>
                  <h3 className="font-medium mb-2">Descrição</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {property.description || 'Descrição não disponível.'}
                  </p>
                </div>

                <Separator />

                {/* Features */}
                {features.length > 0 && (
                  <>
                    <div>
                      <h3 className="font-medium mb-3">Características</h3>
                      <div className="flex flex-wrap gap-2">
                        {features.map((feature, index) => (
                          <Badge key={`${feature}-${index}`} variant="secondary">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Property Type */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-muted-foreground">Tipo de Propriedade</span>
                    <div className="font-medium">
                      {formatPropertyType(property.propertyType)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm text-gray-500">Preço por m²</div>
                    <div className="font-semibold">
                      {property.price && property.area 
                        ? `€${Math.round(property.price / property.area)}`
                        : 'N/A'
                      }
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Listing Agent */}
                {property.listingAgent && (
                  <>
                    <div>
                      <h3 className="font-medium mb-3">Agente Imobiliário</h3>
                      <div className="space-y-2">
                        <div className="font-medium">{property.listingAgent.name}</div>
                        <div className="flex items-center space-x-4">
                          <Button variant="outline" size="sm">
                            <Phone className="h-3 w-3 mr-1" />
                            {property.listingAgent.phone}
                          </Button>
                          <Button variant="outline" size="sm">
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator />
                  </>
                ){/* Action Buttons */}
                <div className="space-y-2 pt-4">
                  <Button className="w-full">Agendar Visita</Button>
                  <Button variant="outline" className="w-full">Solicitar Mais Informações</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
