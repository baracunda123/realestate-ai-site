import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Clock, Eye, ArrowRight, RefreshCw, ExternalLink } from 'lucide-react';
import type { ViewHistoryItem, User } from '../../types/PersonalArea';
import { EmptyState } from '../EmptyState';
import { formatDate, getDaysAgo } from '../../utils/PersonalArea';
import { markAsViewedAgain } from '../../api/view-history.service';
import { toast } from 'sonner';

interface PersonalAreaHistoryProps {
  user: User;
  viewHistory: ViewHistoryItem[];
  onGoToHome: () => void;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
}

export function PersonalAreaHistory({ 
  viewHistory, 
  onGoToHome,
  isLoading = false,
  onRefresh
}: PersonalAreaHistoryProps) {

  const handleViewAgain = async (item: ViewHistoryItem) => {
    try {
      // Track viewing again
      await markAsViewedAgain(item.propertyId);
      
      // Open the original link if available
      if (item.propertyId) {
        // In a real implementation, you might want to construct the link
        // or store the original link in the ViewHistoryItem
        toast.success('Propriedade vista novamente!', {
          description: 'Contador de visualizações atualizado'
        });
        
        // Refresh the history to show updated count
        if (onRefresh) {
          await onRefresh();
        }
      }
    } catch (error) {
      console.error('Failed to mark as viewed again:', error);
      toast.error('Erro ao atualizar visualização');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-medium text-foreground">Histórico de Visualizações</h2>
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Atualizando</span>
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border border-pale-clay-deep bg-pure-white">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-pale-clay-light rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-pale-clay-light rounded w-3/4"></div>
                      <div className="h-3 bg-pale-clay-light rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (viewHistory.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Nenhum histórico de visualizações"
        description="Você ainda não visualizou nenhuma propriedade. Comece explorando nossa seleção para ver o histórico aqui!"
        actionLabel="Explorar Propriedades"
        onAction={onGoToHome}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-foreground">Histórico de Visualizações</h2>
          <p className="text-sm text-muted-foreground">
            {viewHistory.length} propriedades visualizadas recentemente
          </p>
        </div>
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        )}
      </div>

      {/* History List */}
      <div className="space-y-4">
        {viewHistory.map((item) => (
          <Card key={item.id} className="border border-pale-clay-deep bg-pure-white shadow-clay-soft hover:shadow-clay-medium transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-pale-clay-light rounded-lg flex items-center justify-center border border-pale-clay-deep">
                    <Eye className="h-6 w-6 text-cocoa-taupe" />
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-foreground">{item.propertyTitle}</h3>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="text-sm text-muted-foreground">
                        🆔 ID: {item.propertyId}
                      </span>
                      <Badge className="bg-pale-clay-light text-cocoa-taupe border-0 text-xs">
                        📄 Propriedade
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-3 mt-2">
                      <Badge className="bg-pale-clay-light text-cocoa-taupe border-0 text-xs">
                        👁️ {item.viewCount} {item.viewCount === 1 ? 'visualização' : 'visualizações'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getDaysAgo(item.viewedAt)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.viewedAt)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAgain(item)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-burnt-peach hover:bg-burnt-peach-lighter rounded-lg transition-colors border-burnt-peach/20"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>Ver novamente</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Card */}
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-burnt-peach-dark" />
            <span className="text-deep-mocha">Resumo de Atividade</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
              <div className="text-2xl font-semibold text-foreground">{viewHistory.length}</div>
              <div className="text-sm text-muted-foreground">Propriedades vistas</div>
            </div>
            
            <div className="text-center p-4 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
              <div className="text-2xl font-semibold text-foreground">
                {viewHistory.reduce((total, item) => total + item.viewCount, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total de visualizações</div>
            </div>
            
            <div className="text-center p-4 bg-pale-clay-light rounded-lg border border-pale-clay-deep">
              <div className="text-2xl font-semibold text-foreground">
                N/A
              </div>
              <div className="text-sm text-muted-foreground">Preço médio não disponível</div>
            </div>
          </div>

          {/* Additional insights */}
          {viewHistory.length > 0 && (
            <div className="mt-6 pt-4 border-t border-pale-clay-deep">
              <h4 className="text-sm font-medium text-foreground mb-3">Insights da sua atividade</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Propriedade mais vista:</span>
                  <span className="font-medium text-foreground">
                    {Math.max(...viewHistory.map(item => item.viewCount))} visualizações
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Última atividade:</span>
                  <span className="font-medium text-foreground">
                    {getDaysAgo(viewHistory[0]?.viewedAt)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex items-center justify-center space-x-4">
        <Button
          variant="outline"
          onClick={onGoToHome}
          className="flex items-center space-x-2"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Explorar mais propriedades</span>
        </Button>
      </div>
    </div>
  );
}