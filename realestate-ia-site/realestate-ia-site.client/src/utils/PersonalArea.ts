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

// Format price in European format (EUR)
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
};

// Safely parse date from various input types
const parseDate = (dateInput: Date | string | number | undefined | null): Date | null => {
  if (!dateInput) return null;
  
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  
  const parsed = new Date(dateInput);
  return isNaN(parsed.getTime()) ? null : parsed;
};

// Format date in European Portuguese format with safety checks
export const formatDate = (date: Date | string | number | undefined | null): string => {
  const parsedDate = parseDate(date);
  
  if (!parsedDate) {
    return 'Data inválida';
  }
  
  try {
    return new Intl.DateTimeFormat('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(parsedDate);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Data inválida';
  }
};

// Get days ago from date with safety checks
export const getDaysAgo = (date: Date | string | number | undefined | null): string => {
  const parsedDate = parseDate(date);
  
  if (!parsedDate) {
    return 'Data inválida';
  }
  
  try {
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - parsedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1 ? '1 dia atrás' : `${diffDays} dias atrás`;
  } catch (error) {
    console.error('Error calculating days ago:', error);
    return 'Data inválida';
  }
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

// Safe date creation utility for consistent date handling
export const createSafeDate = (dateInput?: Date | string | number | null): Date => {
  const parsedDate = parseDate(dateInput);
  return parsedDate || new Date();
};