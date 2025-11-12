import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Monitor, Smartphone, Tablet, Clock, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { getActiveSessions, revokeAllOtherSessions } from '../../api/auth.service';
import { logger } from '../../utils/logger';
import { parseUserAgent, getDeviceType } from '../../utils/userAgentParser';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';

interface Session {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  lastActivity: string;
  isCurrentSession: boolean;
}

export function ActiveSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        const data = await getActiveSessions();
        if (isMounted) {
          setSessions(data);
          logger.info('Sessões ativas carregadas', 'ACTIVE_SESSIONS');
        }
      } catch (error) {
        if (isMounted) {
          logger.error('Erro ao carregar sessões', 'ACTIVE_SESSIONS', error as Error);
          toast.error('Erro ao carregar sessões', {
            description: 'Não foi possível carregar as sessões ativas.'
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await getActiveSessions();
      setSessions(data);
      logger.info('Sessões ativas carregadas', 'ACTIVE_SESSIONS');
    } catch (error) {
      logger.error('Erro ao carregar sessões', 'ACTIVE_SESSIONS', error as Error);
      toast.error('Erro ao carregar sessões', {
        description: 'Não foi possível carregar as sessões ativas.'
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleRevokeAllOthers = async () => {
    setIsRevokingAll(true);
    try {
      const result = await revokeAllOtherSessions();
      if (result.success) {
        toast.success('Sessões encerradas', {
          description: `${result.revokedCount} sessão(ões) ${result.revokedCount === 1 ? 'foi encerrada' : 'foram encerradas'} com sucesso.`
        });
        await loadSessions();
      }
    } catch (error) {
      logger.error('Erro ao terminar todas as sessões', 'ACTIVE_SESSIONS', error as Error);
      toast.error('Erro ao encerrar sessões', {
        description: 'Não foi possível encerrar as sessões. Por favor, tente novamente.'
      });
    } finally {
      setIsRevokingAll(false);
    }
  };


  const getDeviceIcon = (deviceInfo: string | null) => {
    const deviceType = getDeviceType(deviceInfo);
    
    if (deviceType === 'mobile') {
      return <Smartphone className="h-5 w-5" />;
    }
    if (deviceType === 'tablet') {
      return <Tablet className="h-5 w-5" />;
    }
    return <Monitor className="h-5 w-5" />;
  };

  const formatSessionDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Monitor className="h-5 w-5 text-burnt-peach-dark" />
              <span className="text-deep-mocha">Sessões Ativas</span>
            </CardTitle>
            <CardDescription>
              Gerir os dispositivos com sessão iniciada
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {sessions.length > 1 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-error-gentle text-error-strong hover:bg-error-soft"
                  disabled={isRevokingAll}
                >
                  {isRevokingAll ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      A terminar...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-3 w-3 mr-1" />
                      Terminar sessões
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Terminar todas as outras sessões?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação irá encerrar todas as sessões ativas nos outros dispositivos. Será necessário iniciar sessão novamente nesses dispositivos. A sessão atual permanecerá ativa.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-error-gentle hover:bg-error-strong"
                    onClick={handleRevokeAllOthers}
                  >
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-burnt-peach" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Não existem sessões ativas
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, index) => (
              <div
                key={session.id}
                className={`flex items-start justify-between p-4 rounded-lg border transition-colors ${
                  index === 0
                    ? 'border-burnt-peach bg-burnt-peach/5'
                    : 'border-pale-clay-deep bg-pale-clay-light hover:bg-pale-clay-medium'
                }`}
              >
                <div className="flex items-start space-x-3 flex-1">
                  <div className="text-burnt-peach-dark mt-1">
                    {getDeviceIcon(session.deviceInfo)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-foreground truncate">
                        {parseUserAgent(session.deviceInfo).displayName}
                      </h4>
                      {index === 0 && (
                        <Badge className="bg-burnt-peach text-white text-xs">
                          Sessão Atual
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatSessionDate(session.lastActivity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
