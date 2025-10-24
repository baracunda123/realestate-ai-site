import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '../ui/carousel';
import { 
  TrendingUp, 
  MapPin, 
  Bed, 
  Euro,
  ExternalLink,
  X,
  RefreshCw,
  Sparkles,
  CheckCircle,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  getDashboardRecommendations, 
  markRecommendationAsViewed,
  dismissRecommendation,
  recommendationUtils,
  type RecommendedProperty 
} from '../../api/recommendations.service';
import { recommendations as logger } from '../../utils/logger';

interface RecommendationCardProps {
  recommendation: RecommendedProperty;
  onView: (propertyId: string) => void;
  onDismiss: (propertyId: string) => void;
}

function RecommendationCard({ 
  recommendation, 
  onView, 
  onDismiss, 
}: RecommendationCardProps) {
  const [processing, setProcessing] = useState(false);

  const handleExternalLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (recommendation.link) {
      setProcessing(true);
      try {
        if (!recommendation.isViewed) {
          await markRecommendationAsViewed(recommendation.propertyId);
          onView(recommendation.propertyId);
        }
        window.open(recommendation.link, '_blank', 'noopener,noreferrer');
      } catch (error) {
        logger.error('Erro ao marcar como visualizada', error as Error);
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleDismiss = async () => {
    try {
      await dismissRecommendation(recommendation.propertyId);
      onDismiss(recommendation.propertyId);
      toast.success('Recomendação removida');
    } catch (error) {
      logger.error('Erro ao descartar recomendação', error as Error);
      toast.error('Erro ao remover recomendação');
    }
  };

  const isNew = recommendationUtils.isNew(recommendation.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="group h-full"
    >
      <Card className="recommendation-card border border-pale-clay-deep bg-pure-white shadow-clay-soft h-full flex flex-col transition-all duration-300 hover:shadow-clay-medium hover:border-burnt-peach/30 hover:scale-[1.02]">
        <CardContent className="p-4 flex-1 flex flex-col">
          {/* Header com titulo, badges e botão fechar */}
          <div className="mb-3">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-title text-sm line-clamp-2 flex-1 pr-2">
                {recommendation.title}
              </h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isNew && (
                  <Badge className="recommendation-badge bg-burnt-peach text-pure-white text-xs shadow-burnt-peach border-0 whitespace-nowrap">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Nova
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="recommendation-dismiss-btn h-6 w-6 hover:bg-error-gentle/20 hover:text-error-strong transition-colors"
                  onClick={handleDismiss}
                  aria-label="Remover recomendação"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex items-center text-xs text-clay-secondary">
              <MapPin className="recommendation-icon h-3 w-3 mr-1 flex-shrink-0" />
              <span className="line-clamp-1">{recommendation.location}</span>
            </div>
          </div>

          {/* Preço, quartos e pontuação */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 flex-1">
              {recommendation.price && (
                <div className="flex items-center text-sm font-medium text-title">
                  <Euro className="recommendation-icon h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{recommendation.price.toLocaleString()}</span>
                </div>
              )}
              {recommendation.bedrooms && (
                <div className="flex items-center text-xs text-clay-secondary">
                  <Bed className="recommendation-icon h-3 w-3 mr-1 flex-shrink-0" />
                  <span>{recommendation.bedrooms} qts</span>
                </div>
              )}
            </div>
          </div>

          {/* Texto explicativo */}
          <div className="mb-4 flex-1">
            <p className="text-xs text-warm-taupe line-clamp-2">
              {recommendation.reason}
            </p>
          </div>

          {/* Footer com data, status e botão de ação */}
          <div className="flex items-center justify-between pt-2 mt-auto border-t border-whisper-clay">
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-xs text-clay-secondary">
                <Clock className="recommendation-icon h-3 w-3 mr-1 flex-shrink-0" />
                <span>{new Date(recommendation.createdAt).toLocaleDateString('pt-PT')}</span>
              </div>
              {recommendation.isViewed && (
                <Badge className="bg-success-soft text-success-strong border-success-gentle text-xs shadow-clay-soft">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Vista
                </Badge>
              )}
            </div>
            {recommendation.link && (
              <Button
                variant="outline"
                size="sm"
                className="recommendation-action-btn h-7 text-xs px-3 py-0 border-pale-clay-deep text-warm-taupe hover:bg-burnt-peach hover:text-pure-white hover:border-burnt-peach flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-burnt-peach/20 transition-all"
                onClick={handleExternalLink}
                disabled={processing}
                aria-label={`Ver detalhes de ${recommendation.title}`}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    A carregar...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Ver mais
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface DashboardRecommendationsProps {
  limit?: number;
}

export function DashboardRecommendations({ 
  limit = 6 
}: DashboardRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<RecommendedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideCount, setSlideCount] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const loadRecommendations = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await getDashboardRecommendations(limit);
      // Ordenar por data de criação (mais recente primeiro)
      const sortedProperties = (response.properties || []).sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setRecommendations(sortedProperties);
    } catch (error) {
      logger.error('Erro ao carregar recomendações', error as Error);
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

  useEffect(() => {
    if (carouselApi) {
      setTimeout(() => {
        setCanScrollPrev(carouselApi.canScrollPrev());
        setCanScrollNext(carouselApi.canScrollNext());
      }, 100);
    }
  }, [recommendations, carouselApi]);

  useEffect(() => {
    if (!carouselApi) return;

    const updateCarouselState = () => {
      setSlideCount(carouselApi.scrollSnapList().length);
      setCurrentSlide(carouselApi.selectedScrollSnap());
      setCanScrollPrev(carouselApi.canScrollPrev());
      setCanScrollNext(carouselApi.canScrollNext());
    };

    updateCarouselState();
    carouselApi.on("select", updateCarouselState);
    carouselApi.on("reInit", updateCarouselState);

    return () => {
      carouselApi.off("select", updateCarouselState);
      carouselApi.off("reInit", updateCarouselState);
    };
  }, [carouselApi]);

  if (loading) {
    return (
      <div className="w-full space-y-3">
        <div className="flex items-center gap-3 px-2">
          <TrendingUp className="h-5 w-5 text-burnt-peach animate-pulse" />
          <h2 className="text-lg font-semibold text-title">Recomendações Personalizadas</h2>
        </div>
        <div className="px-6 sm:px-8 md:px-10 pt-4">
          <div className="flex gap-4 md:gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="w-full md:w-1/3 flex-shrink-0"
              >
                <div className="bg-gradient-to-r from-porcelain via-whisper-clay to-porcelain bg-[length:200%_100%] animate-[shimmer_2s_infinite] rounded-lg h-56 border border-pale-clay-deep"></div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-burnt-peach" />
            <h2 className="text-lg font-semibold text-title">Recomendações Personalizadas</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-burnt-peach/10 hover:text-burnt-peach transition-all"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="text-center py-8 px-4">
          <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="text-base font-medium text-foreground mb-1">
            Sem recomendações no momento
          </h3>
          <p className="text-muted-foreground text-xs mb-3">
            Explore propriedades e crie alertas para receber recomendações personalizadas
          </p>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            size="sm"
            className="h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Verificar Novamente
          </Button>
        </div>
      </div>
    );
  }

  const newCount = recommendations.filter(rec => recommendationUtils.isNew(rec.createdAt)).length;
  const unviewedCount = recommendations.filter(rec => !rec.isViewed).length;

  return (
    <div className="w-full space-y-4">
      {/* Header compacto */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-burnt-peach" />
          <h2 className="text-lg font-semibold text-title">Recomendações Personalizadas</h2>
          {newCount > 0 && (
            <Badge className="bg-burnt-peach text-pure-white shadow-burnt-peach border-0 text-xs">
              {newCount} nova{newCount > 1 ? 's' : ''}
            </Badge>
          )}
          {unviewedCount > 0 && (
            <span className="text-xs text-warm-taupe">
              ({unviewedCount} não vista{unviewedCount > 1 ? 's' : ''})
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-burnt-peach/10 hover:text-burnt-peach transition-all"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Carousel */}
      <div className="relative w-full !overflow-visible">
        <div className="relative px-6 sm:px-8 md:px-10 pt-4 pb-4 !overflow-visible">
          <Carousel
            setApi={setCarouselApi}
            opts={{
              align: "start",
              loop: false,
              slidesToScroll: "auto",
            }}
            className="w-full !overflow-visible"
          >
            <CarouselContent className="-ml-4 md:-ml-5 !overflow-visible">
              <AnimatePresence mode="popLayout">
                {recommendations.map((recommendation) => (
                  <CarouselItem 
                    key={recommendation.propertyId}
                    className="pl-4 md:pl-5 basis-full md:basis-1/3 min-w-0 !overflow-visible"
                  >
                    <div className="h-full pt-3 pb-3 px-2">
                      <RecommendationCard
                        recommendation={recommendation}
                        onView={handleView}
                        onDismiss={handleDismiss}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </AnimatePresence>
            </CarouselContent>
            
            {/* Seta Anterior - só aparece se pode scrollar para a esquerda */}
            {canScrollPrev && (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute -left-3 sm:-left-4 md:-left-5 top-1/2 -translate-y-1/2 z-10"
              >
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => carouselApi?.scrollPrev()}
                  className="h-9 w-9 rounded-full bg-pure-white/95 backdrop-blur-sm border-pale-clay-deep hover:bg-burnt-peach hover:border-burnt-peach hover:text-pure-white shadow-lg transition-all"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </motion.div>
            )}
            
            {/* Seta Seguinte - só aparece se pode scrollar para a direita */}
            {canScrollNext && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute -right-3 sm:-right-4 md:-right-5 top-1/2 -translate-y-1/2 z-10"
              >
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => carouselApi?.scrollNext()}
                  className="h-9 w-9 rounded-full bg-pure-white/95 backdrop-blur-sm border-pale-clay-deep hover:bg-burnt-peach hover:border-burnt-peach hover:text-pure-white shadow-lg transition-all"
                  aria-label="Próximo"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </motion.div>
            )}
          </Carousel>
        </div>

        {/* Indicadores de navegação */}
        {slideCount > 1 && (
          <div className="flex justify-center gap-2 pt-1 px-2">
            {Array.from({ length: slideCount }).map((_, index) => (
              <button
                key={index}
                onClick={() => carouselApi?.scrollTo(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentSlide
                    ? 'w-6 bg-burnt-peach'
                    : 'w-1.5 bg-pale-clay-deep hover:bg-warm-taupe'
                }`}
                aria-label={`Ir para slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}