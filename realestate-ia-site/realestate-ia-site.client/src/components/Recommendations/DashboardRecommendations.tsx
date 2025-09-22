import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Star, 
  TrendingUp, 
  MapPin, 
  Bed, 
  Euro,
  Eye,
  X,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getDashboardRecommendations, 
  markRecommendationAsViewed,
  dismissRecommendation,
  recommendationUtils,
  type RecommendedProperty 
} from '../../api/recommendations.service';
import type { Property } from '../../types/property';

interface RecommendationCardProps {
  recommendation: RecommendedProperty;
  onView: (propertyId: string) => void;
  onDismiss: (propertyId: string) => void;
  onPropertySelect: (property: Property) => void;
}

function RecommendationCard({ 
  recommendation, 
  onView, 
  onDismiss, 
  onPropertySelect 
}: RecommendationCardProps) {
  const handleView = async () => {
    try {
      await markRecommendationAsViewed(recommendation.propertyId);
      onView(recommendation.propertyId);
      
      // Converter para Property e navegar
      const property = recommendationUtils.toProperty(recommendation) as Property;
      onPropertySelect(property);
    } catch (error) {
      console.error('Erro ao marcar como visualizada:', error);
    }
  };

  const handleDismiss = async () => {
    try {
      await dismissRecommendation(recommendation.propertyId);
      onDismiss(recommendation.propertyId);
      toast.success('Recomendação removida');
    } catch (error) {
      console.error('Erro ao descartar recomendação:', error);
      toast.error('Erro ao remover recomendação');
    }
  };

  const isNew = recommendationUtils.isNew(recommendation.createdAt);
  const scoreColor = recommendationUtils.getScoreColor(recommendation.score);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="group"
    >
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-soft hover:shadow-clay-medium transition-all duration-200 relative overflow-hidden">
        <CardContent className="p-4">
          {/* Header com titulo, badges e botão fechar */}
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={handleDismiss}
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
            <div className="flex items-center space-x-1 flex-shrink-0">
              <Star className={`h-3 w-3 ${scoreColor}`} />
              <span className={`text-xs font-medium ${scoreColor}`}>
                {recommendation.score}%
              </span>
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
              disabled={recommendation.isViewed}
            >
              {recommendation.isViewed ? (
                <>
                  <Eye className="h-3 w-3 mr-1" />
                  Visualizada
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
}

interface DashboardRecommendationsProps {
  onPropertySelect: (property: Property) => void;
  limit?: number;
}

export function DashboardRecommendations({ 
  onPropertySelect, 
  limit = 6 
}: DashboardRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecommendations = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await getDashboardRecommendations(limit);
      setRecommendations(response.properties || []);
    } catch (error) {
      console.error('Erro ao carregar recomendações:', error);
      setRecommendations([]);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecommendations(false);
    setRefreshing(false);
    toast.success('Recomendações atualizadas');
  };

  const handleView = (propertyId: string) => {
    setRecommendations(prev => 
      prev.map(rec => 
        rec.propertyId === propertyId 
          ? { ...rec, isViewed: true }
          : rec
      )
    );
  };

  const handleDismiss = (propertyId: string) => {
    setRecommendations(prev => 
      prev.filter(rec => rec.propertyId !== propertyId)
    );
  };

  useEffect(() => {
    loadRecommendations();
  }, [limit]);

  if (loading) {
    return (
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-burnt-peach" />
            <span>Recomendações Personalizadas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-porcelain rounded-lg h-32"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-burnt-peach" />
              <span>Recomendações Personalizadas</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              Sem recomendações no momento
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Explore propriedades e crie alertas para receber recomendações personalizadas
            </p>
            <Button onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Verificar Novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const newCount = recommendations.filter(rec => recommendationUtils.isNew(rec.createdAt)).length;
  const unviewedCount = recommendations.filter(rec => !rec.isViewed).length;

  return (
    <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-burnt-peach" />
            <CardTitle>Recomendações Personalizadas</CardTitle>
            {newCount > 0 && (
              <Badge className="bg-burnt-peach text-white">
                {newCount} nova{newCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {unviewedCount > 0 && (
          <p className="text-sm text-muted-foreground">
            {unviewedCount} recomendação{unviewedCount > 1 ? 's' : ''} não visualizada{unviewedCount > 1 ? 's' : ''}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.propertyId}
              recommendation={recommendation}
              onView={handleView}
              onDismiss={handleDismiss}
              onPropertySelect={onPropertySelect}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}