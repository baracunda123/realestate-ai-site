import { useState, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  TrendingUp, 
  MapPin, 
  Bed, 
  Euro,
  Eye,
  X,
  RefreshCw,
  Sparkles,
  Filter,
  SortDesc,
  CheckCircle,
  Brain,
  Clock,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getDashboardRecommendations,
  markRecommendationAsViewed,
  dismissRecommendation,
  getRecommendationStats,
  refreshRecommendations,
  recommendationUtils,
  type RecommendedProperty,
  type RecommendationStats
} from '../../api/recommendations.service';
import type { Property } from '../../types/property';
import { EmptyState } from '../EmptyState';

interface RecommendationCardProps {
  recommendation: RecommendedProperty;
  onView: (propertyId: string) => void;
  onDismiss: (propertyId: string) => void;
  onPropertySelect: (property: Property) => void;
}

const RecommendationCard = memo(function RecommendationCard({ 
  recommendation, 
  onView, 
  onDismiss, 
  onPropertySelect 
}: RecommendationCardProps) {
  const [processing, setProcessing] = useState(false);

  const handleView = useCallback(async () => {
    setProcessing(true);
    try {
      await markRecommendationAsViewed(recommendation.propertyId);
      onView(recommendation.propertyId);
      
      const property = recommendationUtils.toProperty(recommendation) as Property;
      onPropertySelect(property);
    } catch (error) {
      console.error('Erro ao marcar como visualizada:', error);
      toast.error('Erro ao marcar recomendação como visualizada');
    } finally {
      setProcessing(false);
    }
  }, [recommendation.propertyId, onView, onPropertySelect]);

  const handleDismiss = useCallback(async () => {
    setProcessing(true);
    try {
      await dismissRecommendation(recommendation.propertyId);
      onDismiss(recommendation.propertyId);
      toast.success('Recomendação removida');
    } catch (error) {
      console.error('Erro ao descartar recomendação:', error);
      toast.error('Erro ao remover recomendação');
    } finally {
      setProcessing(false);
    }
  }, [recommendation.propertyId, onDismiss]);

  const isNew = recommendationUtils.isNew(recommendation.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className="group"
    >
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-soft hover:shadow-clay-medium transition-all duration-200 relative overflow-hidden">
        <CardContent className="p-4">
          {/* Header com título, badges e botão fechar */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 pr-2">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-foreground text-sm line-clamp-2 flex-1 pr-2">
                  {recommendation.title}
                </h3>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  {isNew && (
                    <Badge className="bg-burnt-peach text-white text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Nova
                    </Badge>
                  )}
                  {recommendation.isViewed && (
                    <Badge className="bg-success-soft text-success-strong border-success-gentle text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Vista
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleDismiss}
                    disabled={processing}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="line-clamp-1">{recommendation.location}</span>
              </div>
            </div>
          </div>

          {/* Preço, quartos e pontuação */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1">
              {recommendation.price && (
                <div className="flex items-center text-sm font-medium">
                  <Euro className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{recommendation.price.toLocaleString()}</span>
                </div>
              )}
              {recommendation.bedrooms && (
                <div className="flex items-center text-xs text-muted-foreground">
                  <Bed className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span>{recommendation.bedrooms}</span>
                </div>
              )}
            </div>
          </div>

          {/* Texto explicativo */}
          <div className="mb-4">
            <p className="text-xs text-muted-foreground line-clamp-2">
              {recommendation.reason}
            </p>
          </div>

          {/* Footer com data e botão de ação */}
          <div className="flex items-center justify-between pt-2 border-t border-porcelain">
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
              <span>{new Date(recommendation.createdAt).toLocaleDateString('pt-PT')}</span>
            </div>
            <Button
              size="sm"
              onClick={handleView}
              className="h-7 text-xs bg-burnt-peach hover:bg-burnt-peach/90 flex-shrink-0"
              disabled={processing}
            >
              {recommendation.isViewed ? (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Ver Novamente
                </>
              ) : (
                <>
                  Ver Propriedade
                  <ArrowRight className="h-3 w-3 ml-1" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

interface PersonalAreaRecommendationsProps {
  onPropertySelect: (property: Property) => void;
}

function PersonalAreaRecommendationsComponent({ 
  onPropertySelect 
}: PersonalAreaRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendedProperty[]>([]);
  const [stats, setStats] = useState<RecommendationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unviewed' | 'new'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [recommendationsResponse, statsResponse] = await Promise.all([
        getDashboardRecommendations(50),
        getRecommendationStats()
      ]);
      
      setRecommendations(recommendationsResponse.properties || []);
      setStats(statsResponse);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setRecommendations([]);
      setStats(null);
      toast.error('Erro ao carregar recomendações');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const result = await refreshRecommendations();
      await loadData(false);
      toast.success(result.message);
    } catch (error) {
      console.error('Erro ao atualizar recomendações:', error);
      toast.error('Erro ao atualizar recomendações');
    } finally {
      setGenerating(false);
    }
  }, [loadData]);

  const handleView = useCallback((propertyId: string) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.propertyId === propertyId 
          ? { ...rec, isViewed: true }
          : rec
      )
    );
  }, []);

  const handleDismiss = useCallback((propertyId: string) => {
    setRecommendations(prev => 
      prev.filter(rec => rec.propertyId !== propertyId)
    );
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter and sort recommendations
  const filteredRecommendations = recommendations
    .filter(rec => {
      switch (filter) {
        case 'unviewed':
          return !rec.isViewed;
        case 'new':
          return recommendationUtils.isNew(rec.createdAt);
        default:
          return true;
      }
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return b.score - a.score;
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <Card className="border border-clay-medium bg-white shadow-clay-soft">
            <CardContent className="p-6">
              <div className="h-20 bg-clay-soft rounded"></div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-clay-soft rounded-lg h-48"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const unviewedCount = recommendations.filter(rec => !rec.isViewed).length;
  const newCount = recommendations.filter(rec => recommendationUtils.isNew(rec.createdAt)).length;

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      {stats && (
        <Card className="border border-clay-medium bg-white shadow-clay-soft">
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-burnt-peach rounded-xl flex items-center justify-center shadow-clay-soft">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-title">Estatísticas de Recomendações</h2>
                <p className="text-sm text-clay-secondary">Análise das suas preferências</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-white border border-clay-medium rounded-lg">
                <div className="text-2xl font-bold text-burnt-primary">{stats.total}</div>
                <div className="text-sm text-clay-secondary">Total</div>
              </div>
              <div className="text-center p-3 bg-white border border-clay-medium rounded-lg">
                <div className="text-2xl font-bold text-success-gentle">{unviewedCount}</div>
                <div className="text-sm text-clay-secondary">Não Visualizadas</div>
              </div>
              <div className="text-center p-3 bg-white border border-clay-medium rounded-lg">
                <div className="text-2xl font-bold text-info-gentle">{newCount}</div>
                <div className="text-sm text-clay-secondary">Novas (24h)</div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Controls */}
      <Card className="border border-clay-medium bg-white shadow-clay-soft">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-burnt-peach rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span className="text-title">Recomendações Personalizadas</span>
              {unviewedCount > 0 && (
                <Badge className="bg-burnt-peach text-white border-0 shadow-clay-soft">
                  {unviewedCount} nova{unviewedCount > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
                className="text-xs"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${generating ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 pt-4 border-t border-clay-soft">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-clay-secondary" />
              <Select value={filter} onValueChange={(value: 'all' | 'unviewed' | 'new') => setFilter(value)}>
                <SelectTrigger className="w-40 h-8 text-xs border-clay-medium focus:border-burnt-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-clay-medium">
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="unviewed">Não Visualizadas</SelectItem>
                  <SelectItem value="new">Novas (24h)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <SortDesc className="h-4 w-4 text-clay-secondary" />
              <Select value={sortBy} onValueChange={(value: 'date' | 'score') => setSortBy(value)}>
                <SelectTrigger className="w-32 h-8 text-xs border-clay-medium focus:border-burnt-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-clay-medium">
                  <SelectItem value="date">Data</SelectItem>
                  <SelectItem value="score">Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Recommendations Grid */}
      {filteredRecommendations.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Sem recomendações"
          description="Não foram encontradas recomendações com os filtros selecionados."
          actionLabel="Atualizar Recomendações"
          onAction={handleGenerate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredRecommendations.map((recommendation) => (
              <RecommendationCard
                key={recommendation.propertyId}
                recommendation={recommendation}
                onView={handleView}
                onDismiss={handleDismiss}
                onPropertySelect={onPropertySelect}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export const PersonalAreaRecommendations = memo(PersonalAreaRecommendationsComponent);