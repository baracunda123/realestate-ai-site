import { useState } from 'react';
import { ProfileLayout } from '../components/Profile/ProfileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import type { User } from '../types/PersonalArea';
import { toast } from 'sonner';
import { deleteAccount } from '../api/auth.service';
import { personalArea as logger } from '../utils/logger';
import { ChangePassword } from '../components/Settings/ChangePassword';

interface SettingsPageProps {
  user: User;
  onDeleteAccount?: () => void;
  hasActiveSearch?: boolean;
  onNavigateToHome?: (reset?: boolean) => void;
}

export function SettingsPage({ onDeleteAccount, hasActiveSearch, onNavigateToHome }: SettingsPageProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      toast.error('Password obrigatória', {
        description: 'Por favor, insere a tua password para confirmar.',
      });
      return;
    }

    setIsDeleting(true);
    
    try {
      logger.info('Iniciando processo de eliminação de conta');
      
      const response = await deleteAccount(deletePassword);
      
      if (response.success) {
        logger.info('Conta eliminada com sucesso');
        toast.success('Conta eliminada com sucesso!', {
          description: 'Os teus dados foram removidos permanentemente.',
        });
        
        if (onDeleteAccount) {
          onDeleteAccount();
        }
      } else {
        throw new Error(response.message || 'Erro ao eliminar conta');
      }
    } catch (error: unknown) {
      logger.error('Erro ao eliminar conta', error as Error);
      const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro inesperado';
      toast.error('Erro ao eliminar conta', {
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
      setDeletePassword('');
    }
  };

  return (
    <ProfileLayout hasActiveSearch={hasActiveSearch} onNavigateToHome={onNavigateToHome}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-title">Configurações</h1>
          <p className="text-muted-foreground mt-2">
            Gere as tuas preferências e configurações de conta
          </p>
        </div>

        {/* Change Password */}
        <ChangePassword />

        {/* Danger Zone */}
        <Card className="border border-error-gentle bg-error-soft shadow-clay-deep">
          <CardHeader>
            <CardTitle className="text-error-strong flex items-center space-x-2">
              <Trash2 className="h-5 w-5" />
              <span>Zona de Perigo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-pure-white rounded-lg border border-error-gentle">
              <div>
                <h4 className="font-medium text-foreground">Eliminar Conta</h4>
                <p className="text-sm text-muted-foreground">
                  Elimina permanentemente a tua conta e todos os dados associados
                </p>
              </div>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-error-gentle text-error-strong hover:bg-error-soft"
                    disabled={isDeleting}
                  >
                    Eliminar Conta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar Conta Permanentemente</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isto eliminará permanentemente a tua conta
                      e removerá todos os teus dados dos nossos servidores, incluindo:
                      <br /><br />
                      • Imóveis favoritos<br />
                      • Pesquisas guardadas<br />
                      • Histórico de visualizações<br />
                      • Alertas configurados<br />
                      <br /><br />
                      <strong>Para confirmar, insere a tua password:</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <Input
                      type="password"
                      placeholder="Insere a tua password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full"
                      disabled={isDeleting}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel 
                      onClick={() => setDeletePassword('')}
                      disabled={isDeleting}
                    >
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-error-gentle hover:bg-error-strong"
                      onClick={handleDeleteAccount}
                      disabled={isDeleting || !deletePassword.trim()}
                    >
                      {isDeleting ? 'A eliminar...' : 'Sim, eliminar permanentemente'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProfileLayout>
  );
}
