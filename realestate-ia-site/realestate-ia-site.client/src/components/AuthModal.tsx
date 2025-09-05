import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Eye, 
  EyeOff, 
  Sparkles,
  Chrome,
  Facebook,
  Apple,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { login, register, type LoginPayload, type RegisterPayload } from '../api/auth.service';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultTab?: 'signin' | 'signup';
}

export function AuthModal({ isOpen, onClose, onSuccess, defaultTab = 'signin' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar mensagens quando o usuário começar a digitar
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  // Função para extrair mensagens de erro do backend
  const extractErrorMessage = (error: any): string => {
    
    if (error.response?.data) {
      const data = error.response.data;
      
      // Se há uma mensagem direta
      if (data.message) {
        return data.message;
      }
      
      // Se há erros de validação específicos (formato ModelState do ASP.NET Core)
      if (data.errors) {
        const errorMessages: string[] = [];
        
        // Se errors é um objeto com campos específicos
        if (typeof data.errors === 'object' && !Array.isArray(data.errors)) {
          Object.keys(data.errors).forEach(field => {
            const fieldErrors = data.errors[field];
            if (Array.isArray(fieldErrors)) {
              errorMessages.push(...fieldErrors);
            } else {
              errorMessages.push(fieldErrors);
            }
          });
        }
        // Se errors é um array
        else if (Array.isArray(data.errors)) {
          errorMessages.push(...data.errors);
        }
        
        if (errorMessages.length > 0) {
          return errorMessages.join('. ');
        }
      }
      
      // Se há title (como no ModelState validation)
      if (data.title && data.title !== 'One or more validation errors occurred.') {
        return data.title;
      }
    }
    
    return 'Erro interno do servidor. Tente novamente.';
  };

  // Ensure correct initial tab when opening or when parent intent changes
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      resetForm();
    }
  }, [isOpen, defaultTab]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const loginData: LoginPayload = {
        email: formData.email,
        password: formData.password
      };

      const result = await login(loginData);

      if (result.success) {
        setSuccess(result.message || 'Login realizado com sucesso!');
        resetForm();
        
        // Aguardar um pouco para mostrar a mensagem de sucesso
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setError(result.message || 'Erro no login. Verifique suas credenciais.');
      }
    } catch (error: any) {
      console.error('Erro no login:', error);
      setError(extractErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (!acceptTerms) {
      setError('Deve aceitar os termos de uso para prosseguir');
      setIsLoading(false);
      return;
    }

    try {
      const registerData: RegisterPayload = {
        fullName: formData.name,
        email: formData.email,
        phoneNumber: formData.phone || undefined,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        acceptTerms: acceptTerms
      };

      const result = await register(registerData);

      if (result.success) {
        setSuccess(result.message || 'Conta criada com sucesso! Verifique seu email para ativar a conta.');
        resetForm();
        
        // Para registro, aguardar mais tempo para ler a mensagem
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 3000);
      } else {
        setError(result.message || 'Erro no registro. Tente novamente.');
      }
    } catch (error: any) {
      console.error('Erro no registro:', error);
      setError(extractErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: ''
    });
    setShowPassword(false);
    setError(null);
    setSuccess(null);
    setAcceptTerms(false);
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto border border-border bg-card shadow-mocha-lg">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 gradient-mocha rounded-xl flex items-center justify-center mb-3">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-xl text-foreground">
            Bem-vindo ao HomeFinder AI
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Encontre o seu lar ideal com tecnologia de ponta. Inicie sessão na sua conta ou crie uma nova conta para começar.
          </DialogDescription>
        </DialogHeader>

        {/* Exibir mensagens de erro */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="text-sm text-destructive">
                {error.split('. ').map((errorMsg, index) => (
                  <div key={index} className={index > 0 ? 'mt-1' : ''}>
                        {errorMsg}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Exibir mensagens de sucesso */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary rounded-xl p-1">
            <TabsTrigger 
              value="signin" 
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              disabled={isLoading}
            >
              Iniciar Sessão
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              disabled={isLoading}
            >
              Registar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 mt-4">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10 border-border focus:border-primary"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Palavra-passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signin-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="A sua palavra-passe"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 pr-10 border-border focus:border-primary"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A iniciar sessão...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Iniciar Sessão
                  </>
                )}
              </Button>
            </form>

            <div className="text-center">
              <Button 
                variant="ghost" 
                className="text-sm text-muted-foreground hover:bg-accent"
                disabled={isLoading}
              >
                Esqueceu-se da palavra-passe?
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="João Silva"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="pl-10 border-border focus:border-primary"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu.email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10 border-border focus:border-primary"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-phone">Telemóvel (opcional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="pl-10 border-border focus:border-primary"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Palavra-passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="pl-10 pr-10 border-border focus:border-primary"
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deve conter: 1 maiúscula, 1 minúscula, 1 número e 1 caractere especial
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">Confirmar Palavra-passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirme a sua palavra-passe"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className="pl-10 border-border focus:border-primary"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Checkbox para aceitar termos */}
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="accept-terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1"
                  disabled={isLoading}
                />
                <Label htmlFor="accept-terms" className="text-xs text-muted-foreground leading-relaxed">
                  Aceito os{' '}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs text-primary" 
                    disabled={isLoading}
                    type="button"
                  >
                    Termos de Uso
                  </Button>{' '}
                  e{' '}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs text-primary" 
                    disabled={isLoading}
                    type="button"
                  >
                    Política de Privacidade
                  </Button>
                </Label>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-sm"
                disabled={isLoading || !acceptTerms}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A criar conta...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Criar Conta
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">ou continue com</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Button 
            variant="outline" 
            className="border-border hover:border-primary/50 hover:bg-accent" 
            disabled={isLoading}
          >
            <Chrome className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            className="border-border hover:border-primary/50 hover:bg-accent" 
            disabled={isLoading}
          >
            <Facebook className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            className="border-border hover:border-primary/50 hover:bg-accent" 
            disabled={isLoading}
          >
            <Apple className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Ao continuar, você concorda com nossos{' '}
            <Button 
              variant="link" 
              className="p-0 h-auto text-xs text-muted-foreground" 
              disabled={isLoading}
            >
              Termos de Uso
            </Button>{' '}
            e{' '}
            <Button 
              variant="link" 
              className="p-0 h-auto text-xs text-muted-foreground" 
              disabled={isLoading}
            >
              Política de Privacidade
            </Button>
          </p>
        </div>

        {activeTab === 'signup' && (
          <div className="bg-soft-peach border border-mocha-lighter rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-xs text-foreground">
                <p className="font-medium mb-1">Benefícios da conta HomeFinder AI:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Salvar propriedades favoritas</li>
                  <li>• Receber alertas personalizados</li>
                  <li>• Histórico de buscas AI</li>
                  <li>• Recomendações exclusivas</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
