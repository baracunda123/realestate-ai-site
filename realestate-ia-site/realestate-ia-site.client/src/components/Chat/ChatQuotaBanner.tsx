import { useEffect, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Sparkles, TrendingUp, AlertCircle } from 'lucide-react';
import { getChatUsageStats, getPlanLabel, formatRenewalDate, type ChatUsageStats } from '../../api/chat-usage.service';
import { useNavigate } from 'react-router-dom';

interface ChatQuotaBannerProps {
  onRefresh?: () => void;
}

export function ChatQuotaBanner({ onRefresh }: ChatQuotaBannerProps) {
  const [stats, setStats] = useState<ChatUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadStats = async () => {
    try {
      const data = await getChatUsageStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas de uso:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Refresh após cada mensagem enviada
  useEffect(() => {
    if (onRefresh) {
      loadStats();
    }
  }, [onRefresh]);

  if (loading || !stats) {
    return null;
  }

  const isNearLimit = stats.usagePercentage >= 80 && stats.usagePercentage < 100;
  const isAtLimit = stats.usagePercentage >= 100;
  const isPremium = stats.planType === 'premium';

  // Premium tem chat ilimitado
  if (isPremium) {
    return (
      <Card className="p-3 bg-gradient-to-r from-burnt-peach/10 to-pale-clay-light border-burnt-peach/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-burnt-peach flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-deep-mocha">
              Plano Premium
            </p>
            <p className="text-xs text-warm-taupe">
              Conversas ilimitadas com AI
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-3 border ${
      isAtLimit 
        ? 'bg-error-bg border-error-strong' 
        : isNearLimit 
        ? 'bg-warning-bg border-warning-strong'
        : 'bg-pale-clay-light border-pale-clay-deep'
    }`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isAtLimit ? (
              <AlertCircle className="h-5 w-5 text-error-strong" />
            ) : (
              <Sparkles className={`h-5 w-5 ${isNearLimit ? 'text-warning-strong' : 'text-burnt-peach'}`} />
            )}
            <div>
              <p className="text-sm font-medium text-deep-mocha">
                Uso do Chat AI
              </p>
              <p className="text-xs text-warm-taupe">
                Plano {getPlanLabel(stats.planType)}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {stats.usedPrompts}/{stats.maxPrompts}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress 
            value={stats.usagePercentage} 
            className={`h-2 ${
              isAtLimit 
                ? '[&>div]:bg-error-strong' 
                : isNearLimit 
                ? '[&>div]:bg-warning-strong'
                : '[&>div]:bg-burnt-peach'
            }`}
          />
          <div className="flex justify-between text-xs text-warm-taupe">
            <span>{stats.remainingPrompts} restantes</span>
            <span>{Math.round(stats.usagePercentage)}% usado</span>
          </div>
        </div>

        {/* Renovação */}
        <p className="text-xs text-warm-taupe">
          Renova em {formatRenewalDate(stats.periodEnd)}
        </p>

        {/* Upgrade Button */}
        {(isAtLimit || isNearLimit) && !stats.hasActiveSubscription && (
          <Button
            onClick={() => navigate('/pricing')}
            className="w-full bg-burnt-peach hover:bg-burnt-peach-light text-deep-mocha font-semibold text-sm"
            size="sm"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Fazer Upgrade
          </Button>
        )}
      </div>
    </Card>
  );
}

