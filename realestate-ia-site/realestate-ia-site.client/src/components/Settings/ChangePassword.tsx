import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../api/client';
import { logger } from '../../utils/logger';

interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePassword() {
  const [formData, setFormData] = useState<ChangePasswordRequest>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'A password deve ter pelo menos 8 caracteres' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'A password deve conter pelo menos uma letra maiúscula' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'A password deve conter pelo menos uma letra minúscula' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'A password deve conter pelo menos um número' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>_+=\-\[\]\\;'/]/.test(password)) {
      return { valid: false, message: 'A password deve conter pelo menos um caractere especial (!@#$%^&*(),.?":{}|<>_+=-[]\\;\'/)'};
    }
    return { valid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (!formData.currentPassword) {
      toast.error('Password atual obrigatória');
      return;
    }

    if (!formData.newPassword) {
      toast.error('Nova password obrigatória');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('As passwords não coincidem');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast.error('A nova password deve ser diferente da atual');
      return;
    }

    const validation = validatePassword(formData.newPassword);
    if (!validation.valid) {
      toast.error('Password inválida', {
        description: validation.message
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post('/api/auth/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });

      toast.success('Password alterada com sucesso!', {
        description: 'A tua password foi atualizada.'
      });

      // Limpar form
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      logger.info('Password alterada com sucesso', 'CHANGE_PASSWORD');
    } catch (error: any) {
      logger.error('Erro ao alterar password', 'CHANGE_PASSWORD', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Erro ao alterar password';
      
      toast.error('Erro ao alterar password', {
        description: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>_+=\-\[\]\\;'/]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: 'Fraca', color: 'bg-error' };
    if (strength <= 4) return { strength, label: 'Média', color: 'bg-warning' };
    return { strength, label: 'Forte', color: 'bg-success' };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  return (
    <Card className="border border-border bg-card shadow-strong">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Lock className="h-5 w-5 text-accent" />
          <span className="text-foreground">Alterar Password</span>
        </CardTitle>
        <CardDescription>
          Atualiza a tua password para manter a conta segura
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Password Atual</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="pr-10"
                placeholder="Insere a tua password atual"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="pr-10"
                placeholder="Insere a nova password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {/* Password Strength Indicator */}
            {formData.newPassword && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Força da password:</span>
                  <span className={`font-medium ${
                    passwordStrength.label === 'Fraca' ? 'text-error' :
                    passwordStrength.label === 'Média' ? 'text-warning' :
                    'text-success'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="hover:bg-muted/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.strength / 6) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="pr-10"
                placeholder="Confirma a nova password"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
              <p className="text-xs text-error">As passwords não coincidem</p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-muted rounded-lg p-3">
            <p className="text-foreground mb-2">Requisitos da password:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className="flex items-center">
                <span className={formData.newPassword.length >= 8 ? 'text-success' : ''}>
                  {formData.newPassword.length >= 8 ? '✓' : '•'} Mínimo 8 caracteres
                </span>
              </li>
              <li className="flex items-center">
                <span className={/[A-Z]/.test(formData.newPassword) ? 'text-success' : ''}>
                  {/[A-Z]/.test(formData.newPassword) ? '✓' : '•'} Uma letra maiúscula
                </span>
              </li>
              <li className="flex items-center">
                <span className={/[a-z]/.test(formData.newPassword) ? 'text-success' : ''}>
                  {/[a-z]/.test(formData.newPassword) ? '✓' : '•'} Uma letra minúscula
                </span>
              </li>
              <li className="flex items-center">
                <span className={/[0-9]/.test(formData.newPassword) ? 'text-success' : ''}>
                  {/[0-9]/.test(formData.newPassword) ? '✓' : '•'} Um número
                </span>
              </li>
              <li className="flex items-center">
                <span className={/[!@#$%^&*(),.?":{}|<>_+=\-\[\]\\;'/]/.test(formData.newPassword) ? 'text-success' : ''}>
                  {/[!@#$%^&*(),.?":{}|<>_+=\-\[\]\\;'/]/.test(formData.newPassword) ? '✓' : '•'} Um caractere especial
                </span>
              </li>
            </ul>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'A alterar...' : 'Alterar Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}