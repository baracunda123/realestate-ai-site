import React, { useState, useEffect } from 'react';
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
  Loader2,
  MailCheck
} from 'lucide-react';
import { login, register, type LoginPayload, type RegisterPayload } from '../api/auth.service';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultTab?: 'signin' | 'signup';
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string[] | string> | string[];
      title?: string;
    };
  };
  message?: string;
}

const INITIAL_FORM_DATA: FormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: ''
};

export function AuthModal({ isOpen, onClose, onSuccess, defaultTab = 'signin' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  // Reset form when modal opens/closes or tab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      resetForm();
    }
  }, [isOpen, defaultTab]);

  const resetForm = () => {
    setFormData(INITIAL_FORM_DATA);
    setShowPassword(false);
    setError(null);
    setSuccess(null);
    setShowEmailConfirmation(false);
    setAcceptTerms(false);
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear messages when user starts typing
    if (error) setError(null);
    if (success) setSuccess(null);
    if (showEmailConfirmation) setShowEmailConfirmation(false);
  };

  const extractErrorMessage = (error: ApiError): string => {
    if (error.response?.data) {
      const data = error.response.data;
      
      if (data.message) return data.message;
      
      if (data.errors) {
        const errorMessages: string[] = [];
        
        if (typeof data.errors === 'object' && !Array.isArray(data.errors)) {
          Object.keys(data.errors).forEach(field => {
            const fieldErrors = data.errors![field];
            if (Array.isArray(fieldErrors)) {
              errorMessages.push(...fieldErrors);
            } else {
              errorMessages.push(fieldErrors);
            }
          });
        } else if (Array.isArray(data.errors)) {
          errorMessages.push(...data.errors);
        }
        
        if (errorMessages.length > 0) {
          return errorMessages.join('. ');
        }
      }
      
      if (data.title && data.title !== 'One or more validation errors occurred.') {
        return data.title;
      }
    }
    
    return 'Internal server error. Please try again.';
  };

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
        setSuccess(result.message || 'Login successful!');
        resetForm();
        
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1500);
      } else {
        setError(result.message || 'Login failed. Please check your credentials.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(extractErrorMessage(error as ApiError));
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
      setError('You must accept the terms of use to continue');
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
        resetForm();
        setShowEmailConfirmation(true);
        setSuccess(result.message || 'Account created successfully!');
      } else {
        setError(result.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(extractErrorMessage(error as ApiError));
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'signin' | 'signup');
  };

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  const renderMessage = () => {
    if (error) {
      return (
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
      );
    }

    if (success) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      );
    }

    if (showEmailConfirmation) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start space-x-3">
            <MailCheck className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <h4 className="font-semibold mb-2">Confirm your email</h4>
              <p className="mb-2">
                A confirmation email has been sent to <strong>{formData.email}</strong>
              </p>
              <p className="text-xs text-blue-600">
                • Check your inbox (and spam folder)<br/>
                • Click the confirmation link in the email<br/>
                • Then you can log into your account
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderPasswordInput = (id: string, placeholder: string, value: string, field: keyof FormData) => (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        id={id}
        type={showPassword ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleInputChange(field, e.target.value)}
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
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto scrollbar-hide border border-border bg-card shadow-mocha-lg">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 gradient-mocha rounded-xl flex items-center justify-center mb-3">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-xl text-foreground">
            Welcome to HomeFinder AI
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Find your ideal home with cutting-edge technology. Sign in to your account or create a new account to get started.
          </DialogDescription>
        </DialogHeader>

        {renderMessage()}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary rounded-xl p-1">
            <TabsTrigger 
              value="signin" 
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              disabled={isLoading}
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger 
              value="signup"
              className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              disabled={isLoading}
            >
              Sign Up
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
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10 border-border focus:border-primary"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                {renderPasswordInput('signin-password', 'Your password', formData.password, 'password')}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground border-0 shadow-sm"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Sign In
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
                Forgot your password?
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-4">
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Silva"
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
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10 border-border focus:border-primary"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-phone">Phone (optional)</Label>
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
                <Label htmlFor="signup-password">Password</Label>
                {renderPasswordInput('signup-password', 'Minimum 8 characters', formData.password, 'password')}
                <p className="text-xs text-muted-foreground">
                  Must contain: 1 uppercase, 1 lowercase, 1 number and 1 special character
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                {renderPasswordInput('signup-confirm-password', 'Confirm your password', formData.confirmPassword, 'confirmPassword')}
              </div>

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
                  I accept the{' '}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs text-primary" 
                    disabled={isLoading}
                    type="button"
                  >
                    Terms of Use
                  </Button>{' '}
                  and{' '}
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs text-primary" 
                    disabled={isLoading}
                    type="button"
                  >
                    Privacy Policy
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
                    Creating account...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Account
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
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or continue with</span>
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

        {activeTab === 'signup' && (
          <div className="bg-soft-peach border border-mocha-lighter rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-xs text-foreground">
                <p className="font-medium mb-1">HomeFinder AI account benefits:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Save favorite properties</li>
                  <li>• Receive personalized alerts</li>
                  <li>• AI search history</li>
                  <li>• Exclusive recommendations</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
