import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { User, Mail, Phone, Shield, Edit, Save, X } from 'lucide-react';
import type { User as UserType } from '../../types/PersonalArea';
import { formatDate } from '../../utils/PersonalArea';
import { toast } from 'sonner';

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
    name: user.name || user.fullName || user.email,
    email: user.email,
    phone: user.phone
  });

  const handleSaveProfile = () => {
    if (onUpdateProfile) {
      onUpdateProfile(profileData);
    }
    setIsEditingProfile(false);
    toast.success('Perfil atualizado com sucesso!', {
      description: 'As suas informações foram guardadas.',
    });
  };

  const handleCancelEdit = () => {
    setProfileData({
      name: user.name || user.fullName || user.email,
      email: user.email,
      phone: user.phone
    });
    setIsEditingProfile(false);
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
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20 border-2 border-pale-clay-deep">
              <AvatarImage src={user.avatar} alt={user.name || user.fullName || user.email} />
              <AvatarFallback className="bg-pale-clay-light text-deep-mocha text-xl">
                {user.name || user.fullName || user.email.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <h2 className="text-xl font-medium text-foreground">{user.name || user.fullName || user.email}</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Membro desde {formatDate(user.createdAt)}
              </p>
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
              {isEditingProfile ? (
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="border-pale-clay-deep focus:border-burnt-peach"
                />
              ) : (
                <div className="flex items-center space-x-2 p-2 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
                  <Mail className="h-4 w-4 text-cocoa-taupe" />
                  <span className="text-deep-mocha">{user.email}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telemóvel</Label>
              {isEditingProfile ? (
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="border-pale-clay-deep focus:border-burnt-peach"
                />
              ) : (
                <div className="flex items-center space-x-2 p-2 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
                  <Phone className="h-4 w-4 text-cocoa-taupe" />
                  <span className="text-deep-mocha">{user.phone}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-burnt-peach-dark" />
            <span className="text-deep-mocha">Segurança da Conta</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
            <div>
              <h4 className="font-medium text-foreground">Palavra-passe</h4>
              <p className="text-sm text-muted-foreground">
                Última alteração há 30 dias
              </p>
            </div>
            <Button
              variant="outline"
              className="border-pale-clay-deep hover:bg-pale-clay-light"
            >
              Alterar Palavra-passe
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
            <div>
              <h4 className="font-medium text-foreground">Autenticação de Dois Fatores</h4>
              <p className="text-sm text-muted-foreground">
                Adicione uma camada extra de segurança
              </p>
            </div>
            <Button
              variant="outline"
              className="border-pale-clay-deep hover:bg-pale-clay-light"
            >
              Configurar 2FA
            </Button>
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