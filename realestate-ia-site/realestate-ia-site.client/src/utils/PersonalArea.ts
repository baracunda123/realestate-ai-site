import type { PlanLimits, User } from '../types/PersonalArea';

// Plan limits configuration
export const planLimits: Record<'free' | 'premium', PlanLimits> = {
  free: {
    maxFavorites: 3,
    maxSavedSearches: 1,
    maxPriceAlerts: 1,
    hasAdvancedAnalytics: false,
    hasMarketInsights: false,
    hasPrioritySupport: false
  },
  premium: {
    maxFavorites: Infinity,
    maxSavedSearches: Infinity,
    maxPriceAlerts: Infinity,
    hasAdvancedAnalytics: true,
    hasMarketInsights: true,
    hasPrioritySupport: true
  }
};

// Get current plan limits based on user
export const getCurrentLimits = (user: User): PlanLimits => {
  return user.isPremium ? planLimits.premium : planLimits.free;
};

// Format price in Brazilian Real
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(price * 5.5);
};

// Format date in Brazilian format
export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

// Get days ago from date
export const getDaysAgo = (date: Date): string => {
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 1 ? '1 dia atrás' : `${diffDays} dias atrás`;
};

// Get property type label in Portuguese
export const getPropertyTypeLabel = (type: string): string => {
  const types: Record<string, string> = {
    'apartment': 'Apartamento',
    'house': 'Casa',
    'condo': 'Condomínio',
    'townhouse': 'Sobrado',
    'any': 'Qualquer'
  };
  return types[type] || type;
};

// Calculate usage percentage
export const getUsagePercentage = (current: number, limit: number): number => {
  if (limit === Infinity) return 0;
  return (current / limit) * 100;
};

// Check if limit is reached
export const isLimitReached = (current: number, limit: number): boolean => {
  if (limit === Infinity) return false;
  return current >= limit;
};