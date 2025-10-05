import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { User, Mail, Edit, Save, X } from 'lucide-react';
import type { User as UserType } from '../../types/PersonalArea';
import { formatDate } from '../../utils/PersonalArea';
import { toast } from 'sonner';
import AvatarUpload from './AvatarUpload';
import { updateProfile } from '../../api/auth.service';

interface PersonalAreaSettingsProps {
  user: UserType;
  onUpdateProfile?: (profileData: Partial<UserType>) => void;
  onDeleteAccount?: () => void;
}

export function PersonalAreaSettings({ 
  user, 
  onUpdateProfile,
  onDeleteAccount 
}: PersonalAreaSettingsProps) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.name || user.fullName || user.email
  });

  const handleSaveProfile = async () => {
    try {
      // Atualizar perfil via API
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
        description: 'As suas informações foram guardadas.',
      });
    } catch (error: unknown) {
      console.error('Erro ao atualizar perfil:', error);
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
  };

  return (
    <div className="space-y-6">
      {/* Profile Information */}
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
                className="border-pale-clay-deep hover:bg-pale-clay-light"
                onClick={() => setIsEditingProfile(true)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Editar
              </Button>
            ) : (
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white"
                  onClick={handleSaveProfile}
                >
                  <Save className="h-3 w-3 mr-1" />
                  Guardar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-pale-clay-deep hover:bg-pale-clay-light"
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
          <div className="flex items-center space-x-6">
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
                  Clique na imagem ou arraste um ficheiro
                </p>
                <p className="text-xs text-muted-foreground">
                  Formatos: JPG, PNG, GIF, WebP (máx. 5MB)
                </p>
              </div>
            </div>

            {/* Informações do Usuário */}
            <div className="flex-1 min-w-0">
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

      {/* Danger Zone */}
      <Card className="border border-error-gentle bg-error-soft shadow-clay-deep">
        <CardHeader>
          <CardTitle className="text-error-strong">Zona de Perigo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-pure-white rounded-lg border border-error-gentle">
            <div>
              <h4 className="font-medium text-foreground">Eliminar Conta</h4>
              <p className="text-sm text-muted-foreground">
                Elimine permanentemente a sua conta e todos os dados associados
              </p>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="border-error-gentle text-error-strong hover:bg-error-soft"
                >
                  Eliminar Conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar Conta Permanentemente</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acção não pode ser desfeita. Isto eliminará permanentemente a sua conta
                    e removerá todos os seus dados dos nossos servidores, incluindo:
                    <br /><br />
                    • Propriedades favoritas<br />
                    • Pesquisas guardadas<br />
                    • Histórico de visualizações<br />
                    • Alertas configurados<br />
                    • Definições de perfil
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-error-gentle hover:bg-error-strong"
                    onClick={onDeleteAccount}
                  >
                    Sim, eliminar permanentemente
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}