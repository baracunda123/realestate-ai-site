import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { User, Mail, Edit, Save, X, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import type { User as UserType } from '../types/PersonalArea';
import { formatDate } from '../utils/PersonalArea';
import AvatarUpload from '../components/PersonalArea/AvatarUpload';
import { updateProfile } from '../api/auth.service';
import { personalArea as logger } from '../utils/logger';
import { SubscriptionManagement } from '../components/Settings/SubscriptionManagement';

interface ProfilePageProps {
  user: UserType;
  onUpdateProfile?: (profileData: Partial<UserType>) => void;
  hasActiveSearch?: boolean;
  onNavigateToHome?: (reset?: boolean) => void;
}

export function ProfilePage({ user, onUpdateProfile, hasActiveSearch, onNavigateToHome }: ProfilePageProps) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name || user.fullName || user.email
  });

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        fullName: profileData.name
      });

      if (onUpdateProfile) {
        onUpdateProfile({
          ...user,
          fullName: profileData.name,
          name: profileData.name
        });
      }
      
      setIsEditingProfile(false);
      toast.success('Perfil atualizado com sucesso!', {
        description: 'As tuas informações foram guardadas.',
      });
    } catch (error: unknown) {
      logger.error('Erro ao atualizar perfil', error as Error);
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro inesperado';
      toast.error('Erro ao atualizar perfil', {
        description: errorMessage,
      });
    }
  };

  const handleCancelEdit = () => {
    setProfileData({
      name: user.name || user.fullName || user.email
    });
    setIsEditingProfile(false);
  };

  const handleAvatarUpdate = async (avatarUrl: string) => {
    // Atualizar o estado local do usuário
    if (onUpdateProfile) {
      onUpdateProfile({
        ...user,
        avatarUrl,
        avatar: avatarUrl
      });
    }
    
    // Atualizar no backend via API
    try {
      await updateProfile({
        avatarUrl: avatarUrl
      });
      toast.success('Avatar atualizado com sucesso!');
    } catch (error) {
      logger.error('Erro ao atualizar avatar no backend', error as Error);
      toast.error('Erro ao atualizar avatar', {
        description: 'As alterações foram salvas localmente mas podem não persistir.'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Botão Voltar */}
        {hasActiveSearch && onNavigateToHome && (
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigateToHome(false)}
              className="flex items-center gap-2 text-gray-600 hover:text-white -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar aos Resultados</span>
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-3xl font-bold text-title">Meu Perfil</h1>
            <p className="text-muted-foreground mt-2">
              Gere as tuas informações pessoais e subscrição
            </p>
          </div>

        {/* Subscription Management */}
        <SubscriptionManagement />

        {/* Profile Information Card */}
        <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-burnt-peach-dark" />
                <span className="text-deep-mocha">Informações do Perfil</span>
              </CardTitle>
              
              {!isEditingProfile ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-pale-clay-deep hover:bg-pale-clay-light hover:text-white"
                  onClick={() => setIsEditingProfile(true)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Editar
                </Button>
              ) : (
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white hover:text-white"
                    onClick={handleSaveProfile}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Guardar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-pale-clay-deep hover:bg-pale-clay-light hover:text-white"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-6">
              {/* Avatar com Upload */}
              <div className="flex flex-col items-center space-y-3">
                <AvatarUpload
                  user={user}
                  onAvatarUpdate={handleAvatarUpdate}
                  size="xl"
                  showEditButton={true}
                />
                <div className="text-center max-w-xs">
                  <p className="text-xs text-muted-foreground">
                    Clica na imagem ou arraste um ficheiro
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Formatos: JPG, PNG, GIF, WebP (máx. 5MB)
                  </p>
                </div>
              </div>

              {/* Informações do Usuário */}
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center space-x-2 mb-2">
                  <h2 className="text-xl font-medium text-foreground truncate">
                    {user.name || user.fullName || user.email}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Membro desde {formatDate(user.createdAt)}
                </p>
                {user.isEmailVerified && (
                  <p className="text-sm text-success-strong mt-1">
                    ✓ Email verificado
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                {isEditingProfile ? (
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="border-pale-clay-deep focus:border-burnt-peach"
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-2 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
                    <User className="h-4 w-4 text-cocoa-taupe" />
                    <span className="text-deep-mocha">{user.name || user.fullName || user.email}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center space-x-2 p-2 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
                  <Mail className="h-4 w-4 text-cocoa-taupe" />
                  <span className="text-deep-mocha">{user.email}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>

            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
