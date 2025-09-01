import type { Property } from './property';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  isPremium?: boolean;
  createdAt: Date;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: {
    location?: string;
    bedrooms?: number;
    propertyType?: string;
    priceRange?: [number, number];
  };
  createdAt: Date;
  results: number;
  newResults: number;
}

export interface PropertyAlert {
  id: string;
  name: string;
  location: string;
  propertyType: string;
  priceRange: [number, number];
  bedrooms: number | null;
  bathrooms: number | null;
  notifications: {
    email: boolean;
    sms: boolean;
    priceDrops: boolean;
    newListings: boolean;
  };
  createdAt: Date;
  isActive: boolean;
  matchCount: number;
  newMatches: number;
  lastTriggered?: Date;
}

export interface ViewHistoryItem {
  id: string;
  propertyTitle: string;
  location: string;
  price: number;
  viewedAt: Date;
  viewCount: number;
}

export interface PlanLimits {
  maxFavorites: number;
  maxSavedSearches: number;
  maxPriceAlerts: number;
  hasAdvancedAnalytics: boolean;
  hasMarketInsights: boolean;
  hasPrioritySupport: boolean;
}

export interface NotificationSettings {
  email: boolean;
  sms: boolean;
  priceAlerts: boolean;
  newListings: boolean;
  marketInsights: boolean;
}

export interface PersonalAreaProps {
  user: User;
  onPropertySelect: (property: Property) => void;
  onOpenUpgradeModal?: () => void;
}

export interface ActivityItem {
  id: string;
  type: 'favorite' | 'alert' | 'search' | 'view';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
}