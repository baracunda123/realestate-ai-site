import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Separator } from './ui/separator';
import { Card, CardContent } from './ui/card';
import { 
  Bell, 
  Home, 
  Building2, 
  Castle, 
  Warehouse,
  MapPin,
  Euro,
  Bed,
  Bath,
  TrendingDown,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface NewAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAlert: (alert: NewAlert) => void;
  editingAlert?: NewAlert;
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
  priceDropAlerts?: boolean;
  newListingAlerts?: boolean;
  isActive: boolean;
  createdAt: Date;
}

const propertyTypeOptions = [
  { value: 'any', label: 'Qualquer Tipo', icon: Home },
  { value: 'house', label: 'Casa', icon: Home },
  { value: 'apartment', label: 'Apartamento', icon: Building2 },
  { value: 'condo', label: 'Condomínio', icon: Castle },
  { value: 'townhouse', label: 'Moradia', icon: Warehouse },
];

const popularLocations = [
  'Lisboa', 'Porto', 'Cascais', 'Sintra', 'Oeiras',
  'Almada', 'Braga', 'Coimbra', 'Aveiro', 'Setúbal'
];

export function NewAlertModal({ isOpen, onClose, onCreateAlert, editingAlert }: NewAlertModalProps) {
  const [alertName, setAlertName] = useState(editingAlert?.name || '');
  const [location, setLocation] = useState(editingAlert?.location || '');
  const [propertyType, setPropertyType] = useState<string>(editingAlert?.propertyType || 'any');
  const [priceRange, setPriceRange] = useState<[number, number]>(editingAlert?.priceRange || [100000, 500000]);
  const [bedrooms, setBedrooms] = useState<number | undefined>(editingAlert?.bedrooms);
  const [bathrooms, setBathrooms] = useState<number | undefined>(editingAlert?.bathrooms);
  const [priceDropPercentage, setPriceDropPercentage] = useState<number>(editingAlert?.priceDropPercentage || 10);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detectar se estamos a editar baseado na presença de editingAlert
  const isEditing = !!editingAlert;

  // Sincronizar formulário com dados de edição quando o modal abre
  useEffect(() => {
    if (isEditing && editingAlert) {
      setAlertName(editingAlert.name || '');
      setLocation(editingAlert.location || '');
      setPropertyType(editingAlert.propertyType || 'any');
      setPriceRange(editingAlert.priceRange || [100000, 500000]);
      setBedrooms(editingAlert.bedrooms);
      setBathrooms(editingAlert.bathrooms);
      setPriceDropPercentage(editingAlert.priceDropPercentage || 10);
    } else if (!isEditing) {
      // Resetar formulário para novo alerta
      setAlertName('');
      setLocation('');
      setPropertyType('any');
      setPriceRange([100000, 500000]);
      setBedrooms(undefined);
      setBathrooms(undefined);
      setPriceDropPercentage(10);
    }
  }, [isEditing, editingAlert]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 NewAlertModal: handleSubmit iniciado');
    console.log('📝 Dados do formulário:', {
      alertName: alertName.trim(),
      location: location.trim(),
      propertyType,
      priceRange,
      bedrooms,
      bathrooms,
      priceDropPercentage
    });
    
    if (!alertName.trim()) {
      console.warn('❌ Validação falhou: Nome do alerta vazio');
      toast.error('Nome do alerta é obrigatório');
      return;
    }

    if (!location.trim()) {
      console.warn('❌ Validação falhou: Localização vazia');
      toast.error('Localização é obrigatória');
      return;
    }

    console.log('✅ Validação passou, criando alerta...');
    setIsSubmitting(true);

    const newAlert: NewAlert = {
      id: Date.now().toString(),
      name: alertName.trim(),
      location: location.trim(),
      propertyType: propertyType as NewAlert['propertyType'],
      priceRange,
      bedrooms,
      bathrooms,
      priceDropPercentage,
      priceDropAlerts: true,
      newListingAlerts: true,
      isActive: true,
      createdAt: new Date(),
    };

    console.log('📦 Alerta criado no componente:', newAlert);
    console.log('🔄 Chamando onCreateAlert...');

    try {
      onCreateAlert(newAlert);
      
      toast.success(isEditing ? 'Alerta atualizado com sucesso!' : 'Alerta criado com sucesso!', {
        description: `Será notificado sobre propriedades em ${location}`,
      });

      console.log('✅ onCreateAlert executado com sucesso');

      // Resetar formulário apenas se não estivermos a editar
      if (!isEditing) {
        console.log('🔄 Resetando formulário...');
        setAlertName('');
        setLocation('');
        setPropertyType('any');
        setPriceRange([100000, 500000]);
        setBedrooms(undefined);
        setBathrooms(undefined);
        setPriceDropPercentage(10);
      }
      
      console.log('🚪 Fechando modal...');
      onClose();
    } catch (error) {
      console.error('❌ Erro ao executar onCreateAlert:', error);
      toast.error('Erro ao criar alerta');
    } finally {
      setIsSubmitting(false);
    }
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
              : 'Configure os seus alertas personalizados para receber notificações quando propriedades que correspondem aos seus critérios ficarem disponíveis ou tiverem o preço reduzido.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Nome do Alerta */}
          <div className="space-y-2">
            <Label htmlFor="alertName" className="text-warm-taupe">
              Nome do Alerta *
            </Label>
            <Input
              id="alertName"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              placeholder="Ex: Apartamentos em Lisboa"
              className="border-pale-clay-deep focus:border-burnt-peach bg-input-background"
              required
            />
          </div>

          {/* Localização */}
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
                  placeholder="Digite as cidades ou regiões de interesse"
                  className="pl-10 border-pale-clay-deep focus:border-burnt-peach bg-input-background"
                  required
                />
              </div>
              
              {/* Localizações Populares */}
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

          {/* Tipo de Propriedade */}
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

          {/* Gama de Preços */}
          <div className="space-y-4">
            <Label className="text-warm-taupe">
              Gama de Preços
            </Label>
            <Card className="border border-pale-clay-deep bg-pale-clay-light">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Euro className="h-4 w-4 text-cocoa-taupe" />
                    <span className="text-sm text-warm-taupe">Gama de valores</span>
                  </div>
                  <div className="text-sm font-medium text-deep-mocha">
                    {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                  </div>
                </div>
                <Slider
                  value={priceRange}
                  onValueChange={(value) => setPriceRange(value as [number, number])}
                  max={2000000}
                  min={50000}
                  step={25000}
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>

          {/* Quartos e Casas de Banho */}
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
                Casas de Banho (Opcional)
              </Label>
              <Select 
                value={bathrooms?.toString() || 'any'} 
                onValueChange={(value) => setBathrooms(value === 'any' ? undefined : parseInt(value))}
              >
                <SelectTrigger className="border-pale-clay-deep focus:border-burnt-peach bg-input-background">
                  <SelectValue>
                    <div className="flex items-center space-x-2">
                      <Bath className="h-4 w-4 text-cocoa-taupe" />
                      <span>{bathrooms ? `${bathrooms} casas de banho` : 'Qualquer'}</span>
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
                        <span>{num} casas de banho</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Alerta de Redução de Preço */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-warm-taupe">
                Alerta de Redução de Preço
              </Label>
            </div>
            <Card className="border border-pale-clay-deep bg-pale-clay-light">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 text-cocoa-taupe" />
                    <span className="text-sm text-warm-taupe">Notificar quando o preço baixar</span>
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

          <Separator className="bg-pale-clay-medium" />

          {/* Botões de Ação */}
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
                ? (isEditing ? 'A guardar...' : 'A criar...') 
                : (isEditing ? 'Guardar Alterações' : 'Criar Alerta')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}