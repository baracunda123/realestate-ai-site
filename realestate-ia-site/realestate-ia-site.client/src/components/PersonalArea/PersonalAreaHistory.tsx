import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock, Eye, ArrowRight } from 'lucide-react';
import type { ViewHistoryItem, User } from '../../types/PersonalArea';
import { EmptyState } from '../EmptyState';
import { formatPrice, formatDate, getDaysAgo } from '../../utils/PersonalArea';

interface PersonalAreaHistoryProps {
  user: User;
  viewHistory: ViewHistoryItem[];
  onGoToHome: () => void;
}

export function PersonalAreaHistory({ 
  viewHistory, 
  onGoToHome 
}: PersonalAreaHistoryProps) {

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
                      <span className="text-sm text-muted-foreground">📍 {item.location}</span>
                      <span className="text-sm font-medium text-burnt-peach">
                        {formatPrice(item.price)}
                      </span>
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
                  <button className="flex items-center space-x-2 px-4 py-2 text-sm text-burnt-peach hover:bg-burnt-peach-lighter rounded-lg transition-colors">
                    <span>Ver novamente</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
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
                {formatPrice(Math.round(viewHistory.reduce((sum, item) => sum + item.price, 0) / viewHistory.length))}
              </div>
              <div className="text-sm text-muted-foreground">Preço médio visto</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}