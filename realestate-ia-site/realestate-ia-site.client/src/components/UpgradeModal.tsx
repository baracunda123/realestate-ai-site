import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { 
  Crown, 
  CreditCard, 
  Shield, 
  Check, 
  ArrowLeft,
  Lock,
  Calendar,
  User,
  Mail,
  Phone,
  Building,
  Sparkles,
  Star,
  Zap
} from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  onUpgradeComplete: () => void;
}

export function UpgradeModal({ isOpen, onClose, onBack, onUpgradeComplete }: UpgradeModalProps) {
  const [step, setStep] = useState<'billing' | 'payment' | 'processing' | 'success'>('billing');
  const [billingInfo, setBillingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cpf: '',
    address: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    installments: '1'
  });

  const handleBillingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('processing');
    
    // Simulate payment processing
    setTimeout(() => {
      setStep('success');
      setTimeout(() => {
        onUpgradeComplete();
        onClose();
      }, 3000);
    }, 2000);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const premiumBenefits = [
    {
      icon: Sparkles,
      title: "Pesquisas Ilimitadas",
      description: "Sem restrições de busca"
    },
    {
      icon: Star,
      title: "Favoritos Infinitos", 
      description: "Salve quantos quiser"
    },
    {
      icon: Zap,
      title: "Recomendações IA",
      description: "Sugestões personalizadas"
    },
    {
      icon: Shield,
      title: "Histórico Completo",
      description: "Acesso total ao histórico"
    }
  ];

  if (step === 'processing') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-pure-white border-pale-clay-deep">
          <div className="text-center py-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 bg-burnt-peach rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CreditCard className="h-8 w-8 text-pure-white" />
            </motion.div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Processando Pagamento
            </h3>
            <p className="text-sm text-muted-foreground">
              Aguarde enquanto processamos seu upgrade...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (step === 'success') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md bg-pure-white border-pale-clay-deep">
          <div className="text-center py-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="w-16 h-16 bg-success-gentle rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Check className="h-8 w-8 text-white" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Upgrade Realizado!
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Bem-vindo ao Premium! Todas as funcionalidades estão disponíveis.
              </p>
              <Badge className="bg-burnt-peach text-pure-white border-0">
                <Crown className="h-3 w-3 mr-1" />
                Premium Ativo
              </Badge>
            </motion.div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-full max-h-[95vh] overflow-y-auto bg-pure-white border-pale-clay-deep sm:max-w-[95vw] lg:max-w-[90vw] xl:max-w-[85vw] 2xl:max-w-[80vw]">
        <DialogHeader className="pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="hover:bg-pale-clay-light h-12 w-12"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-burnt-peach rounded-xl flex items-center justify-center">
                  <Crown className="h-7 w-7 text-pure-white" />
                </div>
                <div>
                  <DialogTitle className="text-4xl font-semibold text-foreground">
                    Upgrade para Premium
                  </DialogTitle>
                  <DialogDescription className="text-xl text-muted-foreground">
                    Complete sua assinatura Premium em apenas 2 passos simples
                  </DialogDescription>
                </div>
              </div>
            </div>
            
            {/* Premium Benefits Summary - Right Side - More Horizontal */}
            <div className="hidden xl:flex flex-1 items-center justify-between gap-8 w-full">
              {premiumBenefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="text-center px-2 flex-1"
                >
                  <div className="w-14 h-14 bg-burnt-peach-light rounded-xl flex items-center justify-center mb-3 mx-auto">
                    <benefit.icon className="h-7 w-7 text-deep-mocha" />
                  </div>
                  <div className="text-sm font-medium text-foreground leading-snug break-words whitespace-normal text-balance">{benefit.title}</div>
                  <div className="text-xs text-muted-foreground leading-snug mt-1 break-words whitespace-normal text-balance">{benefit.description}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Horizontal Layout - Optimized for Wide Screens */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          
          {/* Left Column - Plan Info & Benefits (2/5) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Plan Summary - More Compact */}
            <Card className="border border-pale-clay-deep shadow-clay-deep bg-gradient-to-br from-cocoa-taupe-light to-cocoa-taupe text-white relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-burnt-peach/20 to-transparent"
                animate={{
                  x: ["-100%", "100%"],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
              <CardContent className="p-6 relative z-10">
                <div className="text-center space-y-3">
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Crown className="h-10 w-10 mx-auto text-burnt-peach-lighter" />
                  </motion.div>
                  
                  <h3 className="text-xl font-semibold">Plano Premium</h3>
                  <p className="text-white/95 text-sm">Acesso completo a todas as funcionalidades exclusivas</p>
                  
                  <div className="space-y-1">
                    <div className="text-3xl font-bold">R$ 29,90</div>
                    <div className="text-white/90 text-sm">/mês • Cancele quando quiser</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-3">
                    <div className="text-center py-2 bg-burnt-peach/25 rounded-lg border border-burnt-peach/40">
                      <div className="text-xl font-bold text-burnt-peach-lighter">∞</div>
                      <div className="text-white/90 text-xs">Pesquisas</div>
                    </div>
                    <div className="text-center py-2 bg-pure-white/15 rounded-lg border border-white/25">
                      <div className="text-xl font-bold text-white">∞</div>
                      <div className="text-white/90 text-xs">Favoritos</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Benefits List for Mobile and Tablet */}
            <div className="xl:hidden grid grid-cols-2 lg:grid-cols-4 gap-4">
              {premiumBenefits.map((benefit, index) => (
                <Card key={benefit.title} className="border border-pale-clay-deep bg-pale-clay-light">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 bg-burnt-peach-light rounded-lg flex items-center justify-center mb-3 mx-auto">
                      <benefit.icon className="h-6 w-6 text-deep-mocha" />
                    </div>
                    <div className="text-sm font-medium text-foreground leading-snug break-words whitespace-normal text-balance">{benefit.title}</div>
                    <div className="text-xs text-muted-foreground leading-snug mt-1 break-words whitespace-normal text-balance">{benefit.description}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Security Badge */}
            <Card className="border border-success-gentle/20 bg-success-soft">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-success-gentle/20 rounded-xl flex items-center justify-center">
                    <Shield className="h-6 w-6 text-success-gentle" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Pagamento 100% Seguro</p>
                    <p className="text-sm text-muted-foreground">
                      Criptografia SSL de 256 bits • PCI DSS Compliant
                    </p>
                  </div>
                  <Lock className="h-5 w-5 text-success-gentle ml-auto" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Forms (3/5) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Steps Indicator - Horizontal Layout */}
            <div className="flex items-center justify-center space-x-12 bg-pale-clay-light rounded-2xl p-6">
              <div className={`flex items-center space-x-3 ${step === 'billing' ? 'text-primary' : 'text-success'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step === 'billing' ? 'border-primary bg-primary text-white' : 'border-success bg-success text-white'
                }`}>
                  {step === 'billing' ? '1' : <Check className="h-5 w-5" />}
                </div>
                <div>
                  <span className="font-medium">Dados de Cobrança</span>
                  <div className="text-sm text-muted-foreground">Informações pessoais</div>
                </div>
              </div>
              
              <div className="flex-1 h-px bg-border max-w-32"></div>
              
              <div className={`flex items-center space-x-3 ${step === 'payment' ? 'text-primary' : step === 'billing' ? 'text-muted-foreground' : 'text-success'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step === 'payment' ? 'border-primary bg-primary text-white' : 
                  step === 'billing' ? 'border-muted-foreground' : 'border-success bg-success text-white'
                }`}>
                  {step === 'billing' ? '2' : step === 'payment' ? '2' : <Check className="h-5 w-5" />}
                </div>
                <div>
                  <span className="font-medium">Pagamento</span>
                  <div className="text-sm text-muted-foreground">Cartão de crédito</div>
                </div>
              </div>
            </div>

            {/* Billing Form */}
            {step === 'billing' && (
              <form onSubmit={handleBillingSubmit} className="space-y-6">
                
                {/* Personal Info and Address in Horizontal Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  
                  {/* Personal Information */}
                  <Card className="border border-pale-clay-deep bg-pale-clay-light shadow-clay-soft">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center space-x-3">
                        <User className="h-6 w-6 text-burnt-peach" />
                        <span className="text-xl">Informações Pessoais</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-base">Nome</Label>
                          <Input
                            id="firstName"
                            required
                            value={billingInfo.firstName}
                            onChange={(e) => setBillingInfo({...billingInfo, firstName: e.target.value})}
                            className="border-pale-clay-deep hover:border-burnt-peach-light focus:border-burnt-peach bg-pure-white h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-base">Sobrenome</Label>
                          <Input
                            id="lastName"
                            required
                            value={billingInfo.lastName}
                            onChange={(e) => setBillingInfo({...billingInfo, lastName: e.target.value})}
                            className="border-pale-clay-deep hover:border-burnt-peach-light focus:border-burnt-peach bg-pure-white h-12"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-base">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={billingInfo.email}
                          onChange={(e) => setBillingInfo({...billingInfo, email: e.target.value})}
                          className="border-pale-clay-deep hover:border-burnt-peach-light focus:border-burnt-peach bg-pure-white h-12"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-base">Telefone</Label>
                          <Input
                            id="phone"
                            required
                            value={billingInfo.phone}
                            onChange={(e) => setBillingInfo({...billingInfo, phone: e.target.value})}
                            className="border-pale-clay-deep hover:border-burnt-peach-light focus:border-burnt-peach bg-pure-white h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cpf" className="text-base">CPF</Label>
                          <Input
                            id="cpf"
                            required
                            value={billingInfo.cpf}
                            onChange={(e) => setBillingInfo({...billingInfo, cpf: e.target.value})}
                            className="border-pale-clay-deep hover:border-burnt-peach-light focus:border-burnt-peach bg-pure-white h-12"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Address Information */}
                  <Card className="border border-pale-clay-deep bg-pale-clay-light shadow-clay-soft">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center space-x-3">
                        <Building className="h-6 w-6 text-burnt-peach" />
                        <span className="text-xl">Endereço de Cobrança</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-base">Endereço</Label>
                        <Input
                          id="address"
                          required
                          value={billingInfo.address}
                          onChange={(e) => setBillingInfo({...billingInfo, address: e.target.value})}
                          className="border-pale-clay-deep hover:border-burnt-peach-light focus:border-burnt-peach bg-pure-white h-12"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city" className="text-base">Cidade</Label>
                          <Input
                            id="city"
                            required
                            value={billingInfo.city}
                            onChange={(e) => setBillingInfo({...billingInfo, city: e.target.value})}
                            className="border-pale-clay-deep hover:border-burnt-peach-light focus:border-burnt-peach bg-pure-white h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state" className="text-base">Estado</Label>
                          <Input
                            id="state"
                            required
                            value={billingInfo.state}
                            onChange={(e) => setBillingInfo({...billingInfo, state: e.target.value})}
                            className="border-pale-clay-deep hover:border-burnt-peach-light focus:border-burnt-peach bg-pure-white h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="zipCode" className="text-base">CEP</Label>
                          <Input
                            id="zipCode"
                            required
                            value={billingInfo.zipCode}
                            onChange={(e) => setBillingInfo({...billingInfo, zipCode: e.target.value})}
                            className="border-pale-clay-deep hover:border-burnt-peach-light focus:border-burnt-peach bg-pure-white h-12"
                          />
                        </div>
                      </div>

                      {/* Space filler to match height */}
                      <div className="h-20"></div>
                    </CardContent>
                  </Card>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white shadow-clay-deep border-0 h-14 text-lg font-semibold"
                >
                  <Crown className="h-5 w-5 mr-2" />
                  Continuar para Pagamento
                </Button>
              </form>
            )}

            {/* Payment Form */}
            {step === 'payment' && (
              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                <Card className="border border-pale-clay-deep bg-pale-clay-light shadow-clay-soft">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-3">
                      <CreditCard className="h-6 w-6 text-burnt-peach" />
                      <span className="text-xl">Informações do Cartão</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber" className="text-base">Número do Cartão</Label>
                      <Input
                        id="cardNumber"
                        required
                        maxLength={19}
                        value={paymentInfo.cardNumber}
                        onChange={(e) => setPaymentInfo({...paymentInfo, cardNumber: formatCardNumber(e.target.value)})}
                        placeholder="1234 5678 9012 3456"
                        className="border-pale-clay-deep hover:border-burnt-peach-light focus:border-burnt-peach bg-pure-white h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cardName" className="text-base">Nome no Cartão</Label>
                      <Input
                        id="cardName"
                        required
                        value={paymentInfo.cardName}
                        onChange={(e) => setPaymentInfo({...paymentInfo, cardName: e.target.value})}
                        className="border-pale-clay-deep hover:border-burnt-peach-light focus:border-burnt-peach bg-pure-white h-12"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiryDate" className="text-base">Validade</Label>
                        <Input
                          id="expiryDate"
                          required
                          maxLength={5}
                          value={paymentInfo.expiryDate}
                          onChange={(e) => setPaymentInfo({...paymentInfo, expiryDate: formatExpiryDate(e.target.value)})}
                          placeholder="MM/AA"
                          className="border-pale-clay-deep hover:border-burnt-peach-light focus:border-burnt-peach bg-pure-white h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv" className="text-base">CVV</Label>
                        <Input
                          id="cvv"
                          required
                          maxLength={4}
                          value={paymentInfo.cvv}
                          onChange={(e) => setPaymentInfo({...paymentInfo, cvv: e.target.value.replace(/\D/g, '')})}
                          className="border-pale-clay-deep hover:border-burnt-peach-light focus:border-burnt-peach bg-pure-white h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="installments" className="text-base">Parcelamento</Label>
                        <Select value={paymentInfo.installments} onValueChange={(value) => setPaymentInfo({...paymentInfo, installments: value})}>
                          <SelectTrigger className="border-pale-clay-deep hover:border-burnt-peach-light focus:border-burnt-peach bg-pure-white h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1x de R$ 29,90 à vista</SelectItem>
                            <SelectItem value="2">2x de R$ 15,45</SelectItem>
                            <SelectItem value="3">3x de R$ 10,47</SelectItem>
                            <SelectItem value="6">6x de R$ 5,48</SelectItem>
                            <SelectItem value="12">12x de R$ 2,91</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Separator className="bg-pale-clay-deep" />

                <div className="flex items-center justify-between text-lg bg-pale-clay-light rounded-xl p-6">
                  <span className="text-muted-foreground font-medium">Total a pagar:</span>
                  <span className="text-2xl font-bold text-foreground">R$ 29,90</span>
                </div>

                <div className="flex gap-6 items-center">
                  <Button 
                    type="button"
                    variant="outline" 
                    onClick={() => setStep('billing')}
                    className="w-48 border-pale-clay-deep hover:bg-pale-clay-light h-14 text-lg"
                  >
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Voltar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white shadow-clay-deep border-0 h-14 text-lg font-semibold"
                  >
                    <Lock className="h-5 w-5 mr-2" />
                    Finalizar Pagamento Seguro
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-base text-muted-foreground border-t border-pale-clay-deep pt-6 mt-8">
          <p>✓ Cancele a qualquer momento • ✓ Cobrança recorrente mensal • ✓ Suporte 24/7 • ✓ Garantia de satisfação</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
