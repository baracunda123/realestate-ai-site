import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { 
  Bell, 
  Home, 
  Building2, 
  Castle, 
  Warehouse,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  TrendingDown,
  TrendingUp,
  Mail,
  Smartphone,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface NewAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAlert: (alert: NewAlert) => void;
  isPremium: boolean;
  editingAlert?: any;
}

export interface NewAlert {
  id: string;
  name: string;
  location: string;
  propertyType: 'any' | 'house' | 'apartment' | 'condo' | 'townhouse';
  priceRange: [number, number];
  bedrooms?: number;
  bathrooms?: number;
  priceDropPercentage?: number;
  notifications: {
    email: boolean;
    sms: boolean;
  };
  isActive: boolean;
  createdAt: Date;
}

const propertyTypeOptions = [
  { value: 'any', label: 'Qualquer Tipo', icon: Home },
  { value: 'house', label: 'Casa', icon: Home },
  { value: 'apartment', label: 'Apartamento', icon: Building2 },
  { value: 'condo', label: 'Condomínio', icon: Castle },
  { value: 'townhouse', label: 'Sobrado', icon: Warehouse },
];

const popularLocations = [
  'Vila Madalena', 'Pinheiros', 'Jardins', 'Moema', 'Brooklin',
  'Centro', 'Liberdade', 'Bela Vista', 'Higienópolis', 'Perdizes'
];

export function NewAlertModal({ isOpen, onClose, onCreateAlert, isPremium, editingAlert }: NewAlertModalProps) {
  const [alertName, setAlertName] = useState(editingAlert?.name || '');
  const [location, setLocation] = useState(editingAlert?.location || '');
  const [propertyType, setPropertyType] = useState<string>(editingAlert?.propertyType || 'any');
  const [priceRange, setPriceRange] = useState<[number, number]>(editingAlert?.priceRange || [500000, 2000000]);
  const [bedrooms, setBedrooms] = useState<number | undefined>(editingAlert?.bedrooms);
  const [bathrooms, setBathrooms] = useState<number | undefined>(editingAlert?.bathrooms);
  const [priceDropPercentage, setPriceDropPercentage] = useState<number>(editingAlert?.priceDropPercentage || 10);
  const [emailNotifications, setEmailNotifications] = useState(editingAlert?.notifications?.email ?? true);
  const [smsNotifications, setSmsNotifications] = useState(editingAlert?.notifications?.sms ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detect if we're editing based on editingAlert presence
  const isEditing = !!editingAlert;

  // Sync form with editing data when modal opens
  useEffect(() => {
    if (isEditing && editingAlert) {
      setAlertName(editingAlert.name || '');
      setLocation(editingAlert.location || '');
      setPropertyType(editingAlert.propertyType || 'any');
      setPriceRange(editingAlert.priceRange || [500000, 2000000]);
      setBedrooms(editingAlert.bedrooms);
      setBathrooms(editingAlert.bathrooms);
      setPriceDropPercentage(editingAlert.priceDropPercentage || 10);
      setEmailNotifications(editingAlert.notifications?.email ?? true);
      setSmsNotifications(editingAlert.notifications?.sms ?? false);
    } else if (!isEditing) {
      // Reset form for new alert
      setAlertName('');
      setLocation('');
      setPropertyType('any');
      setPriceRange([500000, 2000000]);
      setBedrooms(undefined);
      setBathrooms(undefined);
      setPriceDropPercentage(10);
      setEmailNotifications(true);
      setSmsNotifications(false);
    }
  }, [isEditing, editingAlert]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!alertName.trim()) {
      toast.error('Nome do alerta é obrigatório');
      return;
    }

    if (!location.trim()) {
      toast.error('Localização é obrigatória');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    const newAlert: NewAlert = {
      id: Date.now().toString(),
      name: alertName.trim(),
      location: location.trim(),
      propertyType: propertyType as any,
      priceRange,
      bedrooms,
      bathrooms,
      priceDropPercentage,
      notifications: {
        email: emailNotifications,
        sms: smsNotifications,
      },
      isActive: true,
      createdAt: new Date(),
    };

    onCreateAlert(newAlert);
    
    toast.success(isEditing ? 'Alerta atualizado com sucesso!' : 'Alerta criado com sucesso!', {
      description: `Você será notificado sobre propriedades em ${location}`,
    });

    // Reset form only if not editing
    if (!isEditing) {
      setAlertName('');
      setLocation('');
      setPropertyType('any');
      setPriceRange([500000, 2000000]);
      setBedrooms(undefined);
      setBathrooms(undefined);
      setPriceDropPercentage(10);
      setEmailNotifications(true);
      setSmsNotifications(false);
    }
    setIsSubmitting(false);
    
    onClose();
  };

  const addLocationChip = (loc: string) => {
    if (!location.includes(loc)) {
      setLocation(location ? `${location}, ${loc}` : loc);
    }
  };

  const selectedPropertyType = propertyTypeOptions.find(option => option.value === propertyType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-pure-white border border-pale-clay-deep">
        <DialogHeader className="pb-4 border-b border-pale-clay-medium">
          <DialogTitle className="flex items-center space-x-2 text-deep-mocha">
            <div className="w-8 h-8 bg-burnt-peach rounded-lg flex items-center justify-center">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <span>{isEditing ? 'Editar Alerta de Preço' : 'Criar Novo Alerta de Preço'}</span>
          </DialogTitle>
          <DialogDescription className="text-warm-taupe mt-2">
{isEditing 
              ? 'Atualize os critérios do seu alerta para receber notificações mais precisas sobre propriedades de interesse.'
              : 'Configure seus alertas personalizados para receber notificações quando propriedades que correspondem aos seus critérios ficarem disponíveis ou tiverem o preço reduzido.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Alert Name */}
          <div className="space-y-2">
            <Label htmlFor="alertName" className="text-warm-taupe">
              Nome do Alerta *
            </Label>
            <Input
              id="alertName"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              placeholder="Ex: Apartamentos Vila Madalena"
              className="border-pale-clay-deep focus:border-burnt-peach bg-input-background"
              required
            />
          </div>

          {/* Location */}
          <div className="space-y-3">
            <Label className="text-warm-taupe">
              Localização *
            </Label>
            <div className="space-y-3">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-cocoa-taupe" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Digite os bairros ou regiões de interesse"
                  className="pl-10 border-pale-clay-deep focus:border-burnt-peach bg-input-background"
                  required
                />
              </div>
              
              {/* Popular Locations */}
              <div className="space-y-2">
                <Label className="text-xs text-warm-taupe-light">
                  Localizações Populares
                </Label>
                <div className="flex flex-wrap gap-2">
                  {popularLocations.map((loc) => (
                    <Button
                      key={loc}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addLocationChip(loc)}
                      className="h-7 px-3 text-xs border-pale-clay-deep text-cocoa-taupe hover:bg-pale-clay-light hover:border-cocoa-taupe"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {loc}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Property Type */}
          <div className="space-y-3">
            <Label className="text-warm-taupe">
              Tipo de Propriedade
            </Label>
            <Select value={propertyType} onValueChange={setPropertyType}>
              <SelectTrigger className="border-pale-clay-deep focus:border-burnt-peach bg-input-background">
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    {selectedPropertyType && (
                      <>
                        <selectedPropertyType.icon className="h-4 w-4 text-cocoa-taupe" />
                        <span>{selectedPropertyType.label}</span>
                      </>
                    )}
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-pure-white border border-pale-clay-deep">
                {propertyTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <option.icon className="h-4 w-4 text-cocoa-taupe" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="space-y-4">
            <Label className="text-warm-taupe">
              Faixa de Preço
            </Label>
            <Card className="border border-pale-clay-deep bg-pale-clay-light">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-cocoa-taupe" />
                    <span className="text-sm text-warm-taupe">Faixa de valores</span>
                  </div>
                  <div className="text-sm font-medium text-deep-mocha">
                    {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                  </div>
                </div>
                <Slider
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  max={5000000}
                  min={100000}
                  step={50000}
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>

          {/* Bedrooms & Bathrooms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-warm-taupe">
                Quartos (Opcional)
              </Label>
              <Select 
                value={bedrooms?.toString() || 'any'} 
                onValueChange={(value) => setBedrooms(value === 'any' ? undefined : parseInt(value))}
              >
                <SelectTrigger className="border-pale-clay-deep focus:border-burnt-peach bg-input-background">
                  <SelectValue>
                    <div className="flex items-center space-x-2">
                      <Bed className="h-4 w-4 text-cocoa-taupe" />
                      <span>{bedrooms ? `${bedrooms} quartos` : 'Qualquer'}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-pure-white border border-pale-clay-deep">
                  <SelectItem value="any">
                    <div className="flex items-center space-x-2">
                      <Bed className="h-4 w-4 text-cocoa-taupe" />
                      <span>Qualquer</span>
                    </div>
                  </SelectItem>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      <div className="flex items-center space-x-2">
                        <Bed className="h-4 w-4 text-cocoa-taupe" />
                        <span>{num} quartos</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-warm-taupe">
                Banheiros (Opcional)
              </Label>
              <Select 
                value={bathrooms?.toString() || 'any'} 
                onValueChange={(value) => setBathrooms(value === 'any' ? undefined : parseInt(value))}
              >
                <SelectTrigger className="border-pale-clay-deep focus:border-burnt-peach bg-input-background">
                  <SelectValue>
                    <div className="flex items-center space-x-2">
                      <Bath className="h-4 w-4 text-cocoa-taupe" />
                      <span>{bathrooms ? `${bathrooms} banheiros` : 'Qualquer'}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-pure-white border border-pale-clay-deep">
                  <SelectItem value="any">
                    <div className="flex items-center space-x-2">
                      <Bath className="h-4 w-4 text-cocoa-taupe" />
                      <span>Qualquer</span>
                    </div>
                  </SelectItem>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      <div className="flex items-center space-x-2">
                        <Bath className="h-4 w-4 text-cocoa-taupe" />
                        <span>{num} banheiros</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price Drop Alert */}
          {isPremium && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-warm-taupe">
                  Alerta de Redução de Preço
                </Label>
                <Badge className="bg-burnt-peach text-white border-0 text-xs">
                  Premium
                </Badge>
              </div>
              <Card className="border border-pale-clay-deep bg-pale-clay-light">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <TrendingDown className="h-4 w-4 text-cocoa-taupe" />
                      <span className="text-sm text-warm-taupe">Notificar quando o preço cair</span>
                    </div>
                    <div className="text-sm font-medium text-deep-mocha">
                      {priceDropPercentage}% ou mais
                    </div>
                  </div>
                  <Slider
                    value={[priceDropPercentage]}
                    onValueChange={(value) => setPriceDropPercentage(value[0])}
                    max={50}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                </CardContent>
              </Card>
            </div>
          )}

          <Separator className="bg-pale-clay-medium" />

          {/* Notification Settings */}
          <div className="space-y-4">
            <Label className="text-warm-taupe">
              Configurações de Notificação
            </Label>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-burnt-peach-lighter rounded-lg flex items-center justify-center">
                    <Mail className="h-4 w-4 text-burnt-peach-dark" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-deep-mocha">Notificações por Email</p>
                    <p className="text-xs text-warm-taupe">Receba alertas no seu email</p>
                  </div>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-burnt-peach-lighter rounded-lg flex items-center justify-center">
                    <Smartphone className="h-4 w-4 text-burnt-peach-dark" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-deep-mocha">Notificações por SMS</p>
                    <p className="text-xs text-warm-taupe">
                      Receba alertas por mensagem de texto
                      {!isPremium && (
                        <Badge className="ml-2 bg-pale-clay text-warm-taupe border border-pale-clay-deep text-xs">
                          Premium
                        </Badge>
                      )}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={smsNotifications}
                  onCheckedChange={setSmsNotifications}
                  disabled={!isPremium}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-pale-clay-medium">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="border-pale-clay-deep text-cocoa-taupe hover:bg-pale-clay-light"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-burnt-peach hover:bg-burnt-peach-deep text-white border-0"
            >
{isSubmitting 
                ? (isEditing ? 'Salvando...' : 'Criando...') 
                : (isEditing ? 'Salvar Alterações' : 'Criar Alerta')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}