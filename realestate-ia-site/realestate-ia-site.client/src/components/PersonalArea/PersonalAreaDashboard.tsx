import { motion } from 'framer-motion';
import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { 
  Heart, 
  Bookmark, 
  Bell, 
  ArrowRight,
} from 'lucide-react';
import { DashboardRecommendations } from '../Recommendations/DashboardRecommendations';
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
  onCardClick
}: PersonalAreaDashboardProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

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
          className="dashboard-card-container cursor-pointer"
          onClick={() => onCardClick('favorites')}
          onMouseEnter={() => setHoveredCard('favorites')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <Card className="dashboard-section-card border border-burnt-peach-light bg-pure-white shadow-clay-soft overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Heart className="h-5 w-5 text-burnt-peach-dark" />
                    <span className="text-sm font-medium text-warm-taupe">Favoritos</span>
                  </div>
                  <p className="text-3xl font-bold text-title">
                    {favoritesCount}
                  </p>
                </div>
                <div className="p-3 bg-burnt-peach-lighter rounded-lg shadow-clay-soft group-hover:shadow-burnt-peach group-hover:scale-110 transition-all duration-200">
                  <Heart className="h-6 w-6 text-burnt-peach-dark" />
                </div>
              </div>
              <motion.div 
                className="mt-4 flex items-center text-sm text-burnt-peach-darker font-semibold"
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: hoveredCard === 'favorites' ? 1 : 0, 
                  y: hoveredCard === 'favorites' ? 0 : 10 
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                Ver favoritos <ArrowRight className="h-4 w-4 ml-1" />
              </motion.div>
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
          className="dashboard-card-container cursor-pointer"
          onClick={() => onCardClick('searches')}
          onMouseEnter={() => setHoveredCard('searches')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <Card className="dashboard-section-card border border-cocoa-taupe-light bg-pure-white shadow-clay-soft overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Bookmark className="h-5 w-5 text-cocoa-taupe-dark" />
                    <span className="text-sm font-medium text-warm-taupe">Pesquisas Salvas</span>
                  </div>
                  <p className="text-3xl font-bold text-title">
                    {savedSearchesCount}
                  </p>
                </div>
                <div className="p-3 bg-cocoa-taupe-lighter rounded-lg shadow-clay-soft group-hover:shadow-cocoa-taupe group-hover:scale-110 transition-all duration-200">
                  <Bookmark className="h-6 w-6 text-cocoa-taupe-dark" />
                </div>
              </div>
              <motion.div 
                className="mt-4 flex items-center text-sm text-cocoa-taupe-darker font-semibold"
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: hoveredCard === 'searches' ? 1 : 0, 
                  y: hoveredCard === 'searches' ? 0 : 10 
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                Ver pesquisas <ArrowRight className="h-4 w-4 ml-1" />
              </motion.div>
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
          className="dashboard-card-container cursor-pointer"
          onClick={() => onCardClick('alerts')}
          onMouseEnter={() => setHoveredCard('alerts')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <Card className="dashboard-section-card border border-cocoa-taupe-light bg-pure-white shadow-clay-soft overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Bell className="h-5 w-5 text-cocoa-taupe-dark" />
                    <span className="text-sm font-medium text-warm-taupe">Alertas Ativos</span>
                  </div>
                  <p className="text-3xl font-bold text-title">
                    {alertsCount}
                  </p>
                </div>
                <div className="p-3 bg-cocoa-taupe-lighter rounded-lg shadow-clay-soft group-hover:shadow-cocoa-taupe group-hover:scale-110 transition-all duration-200">
                  <Bell className="h-6 w-6 text-cocoa-taupe-dark" />
                </div>
              </div>
              <motion.div 
                className="mt-4 flex items-center text-sm text-cocoa-taupe-darker font-semibold"
                initial={{ opacity: 0, y: 10 }}
                animate={{ 
                  opacity: hoveredCard === 'alerts' ? 1 : 0, 
                  y: hoveredCard === 'alerts' ? 0 : 10 
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                Ver alertas <ArrowRight className="h-4 w-4 ml-1" />
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recommendations Section */}
      <DashboardRecommendations 
        limit={6}
      />

      {/* Alert Notifications */}
      <DashboardAlertNotifications limit={5} />
    </div>
  );
}