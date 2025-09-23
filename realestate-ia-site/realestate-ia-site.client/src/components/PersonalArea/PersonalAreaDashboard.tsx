import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui/card';
import { 
  Heart, 
  Bookmark, 
  Bell, 
  ArrowRight,
} from 'lucide-react';
//import { type Property } from '../../types/property';
//import { DashboardRecommendations } from '../Recommendations/DashboardRecommendations';
import { DashboardAlertNotifications } from '../AlertNotifications/DashboardAlertNotifications';

interface PersonalAreaDashboardProps {
  favoritesCount: number;
  savedSearchesCount: number;
  alertsCount: number;
  onCardClick: (tabName: string) => void;
}

export function PersonalAreaDashboard({ 
  favoritesCount, 
  savedSearchesCount, 
  alertsCount,
  onCardClick,
}: PersonalAreaDashboardProps) {
  return (
    <div className="space-y-6">
      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Favorites Card */}
        <motion.div
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.99 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            duration: 0.15
          }}
          className="cursor-pointer group"
          onClick={() => onCardClick('favorites')}
        >
          <Card className="border border-burnt-peach-light bg-pure-white shadow-clay-soft hover:shadow-clay-medium transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Heart className="h-5 w-5 text-burnt-peach-dark" />
                    <span className="text-sm font-medium text-muted-foreground">Favoritos</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {favoritesCount}
                  </p>
                </div>
                <div className="p-3 bg-burnt-peach-lighter rounded-lg">
                  <Heart className="h-6 w-6 text-burnt-peach-dark" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-burnt-peach-dark opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                Ver favoritos <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Saved Searches Card */}
        <motion.div
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.99 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            duration: 0.15
          }}
          className="cursor-pointer group"
          onClick={() => onCardClick('searches')}
        >
          <Card className="border border-cocoa-taupe-light bg-pure-white shadow-clay-soft hover:shadow-clay-medium transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Bookmark className="h-5 w-5 text-cocoa-taupe-dark" />
                    <span className="text-sm font-medium text-muted-foreground">Pesquisas Salvas</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {savedSearchesCount}
                  </p>
                </div>
                <div className="p-3 bg-cocoa-taupe-lighter rounded-lg">
                  <Bookmark className="h-6 w-6 text-cocoa-taupe-dark" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-cocoa-taupe-dark opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                Ver pesquisas <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alerts Card */}
        <motion.div
          whileHover={{ scale: 1.01, y: -1 }}
          whileTap={{ scale: 0.99 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 25,
            duration: 0.15
          }}
          className="cursor-pointer group"
          onClick={() => onCardClick('alerts')}
        >
          <Card className="border border-cocoa-taupe-light bg-pure-white shadow-clay-soft hover:shadow-clay-medium transition-shadow duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Bell className="h-5 w-5 text-cocoa-taupe-dark" />
                    <span className="text-sm font-medium text-muted-foreground">Alertas Ativos</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {alertsCount}
                  </p>
                </div>
                <div className="p-3 bg-cocoa-taupe-lighter rounded-lg">
                  <Bell className="h-6 w-6 text-cocoa-taupe-dark" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-cocoa-taupe-dark opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200">
                Ver alertas <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recommendations Section - Temporariamente desabilitado */}
      {/* {onPropertySelect && (
        <DashboardRecommendations 
          onPropertySelect={onPropertySelect}
          limit={6}
        />
      )} */}

      {/* Two-column layout for Notifications and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Alert Notifications */}
        <DashboardAlertNotifications limit={5} />
      </div>
    </div>
  );
}