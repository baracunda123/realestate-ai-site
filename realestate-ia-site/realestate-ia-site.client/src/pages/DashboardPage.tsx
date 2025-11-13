import { ProfileLayout } from '../components/Profile/ProfileLayout';
import { DashboardRecommendations } from '../components/Recommendations/DashboardRecommendations';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { TrendingUp, Heart, Clock, Search } from 'lucide-react';
import type { User } from '../types/PersonalArea';

interface DashboardPageProps {
  user: User;
  hasActiveSearch?: boolean;
  onNavigateToHome?: (reset?: boolean) => void;
  favoritesCount?: number;
  searchesCount?: number;
}

export function DashboardPage({ 
  user,
  hasActiveSearch,
  onNavigateToHome,
  favoritesCount = 0,
  searchesCount = 0
}: DashboardPageProps) {
  return (
    <ProfileLayout hasActiveSearch={hasActiveSearch} onNavigateToHome={onNavigateToHome}>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-title">
            Olá, {user.name || user.fullName || 'Utilizador'}! 👋
          </h1>
          <p className="text-muted-foreground mt-2">
            Aqui estão as tuas recomendações personalizadas
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-pale-clay-deep bg-pure-white shadow-clay-soft hover:shadow-clay-medium transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-clay-secondary">
                Favoritos
              </CardTitle>
              <Heart className="h-4 w-4 text-burnt-peach" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-title">{favoritesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Propriedades guardadas
              </p>
            </CardContent>
          </Card>

          <Card className="border-pale-clay-deep bg-pure-white shadow-clay-soft hover:shadow-clay-medium transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-clay-secondary">
                Pesquisas
              </CardTitle>
              <Search className="h-4 w-4 text-burnt-peach" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-title">{searchesCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Últimos 30 dias
              </p>
            </CardContent>
          </Card>

          <Card className="border-pale-clay-deep bg-pure-white shadow-clay-soft hover:shadow-clay-medium transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-clay-secondary">
                Atividade
              </CardTitle>
              <Clock className="h-4 w-4 text-burnt-peach" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-title">Ativo</div>
              <p className="text-xs text-muted-foreground mt-1">
                Última atividade hoje
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations Section */}
        <div className="mt-8">
          <DashboardRecommendations limit={9} />
        </div>

        {/* Info Card */}
        <Card className="border-burnt-peach/20 bg-gradient-to-br from-burnt-peach/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <TrendingUp className="h-5 w-5 text-burnt-peach flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-title mb-1">
                  Como funcionam as recomendações?
                </h3>
                <p className="text-sm text-clay-secondary">
                  As recomendações são personalizadas com base nos teus favoritos, pesquisas e propriedades visualizadas. 
                  Quanto mais interagires com a plataforma, mais precisas serão as sugestões.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProfileLayout>
  );
}
