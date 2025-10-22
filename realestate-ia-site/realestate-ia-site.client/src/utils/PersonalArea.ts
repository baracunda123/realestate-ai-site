import type { User, PropertyAlert } from '../types/PersonalArea';
import { personalArea } from '../utils/logger';

// Format price in European format (EUR)
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
};

// Função auxiliar para formatPriceRange
export const formatPriceRange = (minPrice?: number | null, maxPrice?: number | null): string => {
  if (!minPrice && !maxPrice) return 'Qualquer preço';
  if (minPrice && !maxPrice) return `A partir de ${formatPrice(minPrice)}`;
  if (!minPrice && maxPrice) return `Até ${formatPrice(maxPrice)}`;
  return `${formatPrice(minPrice!)} - ${formatPrice(maxPrice!)}`;
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
    personalArea.error('Error formatting date', error as Error);
    return 'Data inválida';
  }
};

// Format date in Brazilian Portuguese format with safety checks
export const formatDateBR = (date: Date | string | number | undefined | null): string => {
  const parsedDate = parseDate(date);
  
  if (!parsedDate) {
    return 'Data inválida';
  }
  
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(parsedDate);
  } catch (error) {
    personalArea.error('Error formatting date', error as Error);
    return 'Data inválida';
  }
};

// Format date and time in Brazilian Portuguese with safety checks
export const formatDateTimeBR = (date: Date | string | number | undefined | null): string => {
  const parsedDate = parseDate(date);
  
  if (!parsedDate) {
    return 'Data inválida';
  }
  
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(parsedDate);
  } catch (error) {
    personalArea.error('Error formatting date', error as Error);
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
    personalArea.error('Error calculating days ago', error as Error);
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

// Safe date creation utility for consistent date handling
export const createSafeDate = (dateInput?: Date | string | number | null): Date => {
  const parsedDate = parseDate(dateInput);
  return parsedDate || new Date();
};

/**
 * Obter label para tipo de propriedade
 */
export function getPropertyTypeLabelDB(type: string | null | undefined): string {
  switch (type?.toLowerCase()) {
    case 'house':
    case 'casa':
      return 'Casa';
    case 'apartment':
    case 'apartamento':
      return 'Apartamento';
    case 'condo':
    case 'condominio':
      return 'Condomínio';
    case 'townhouse':
    case 'sobrado':
      return 'Sobrado';
    case 'any':
      return 'Qualquer Tipo';
    default:
      return type || 'Não especificado';
  }
}

/**
 * Gerar nome de usuário de exibição
 */
export function getDisplayName(user: User): string {
  if (user.fullName?.trim()) {
    return user.fullName.trim();
  }
  
  if (user.name?.trim()) {
    return user.name.trim();
  }
  
  // Fallback: primeira parte do email
  if (user.email) {
    const emailPart = user.email.split('@')[0];
    return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
  }
  
  return 'Usuário';
}

/**
 * Gerar iniciais do usuário para avatar
 */
export function getUserInitials(user: User): string {
  const displayName = getDisplayName(user);
  
  const words = displayName.split(' ').filter(word => word.length > 0);
  
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  return 'U';
}

/**
 * Validar se email está no formato correto
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Correção das funções de telefone
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove caracteres não numéricos exceto +
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Se tem código de país
  if (cleanPhone.startsWith('+')) {
    return cleanPhone;
  }
  
  // Se é número português (9 dígitos)
  if (cleanPhone.length === 9) {
    return `+351 ${cleanPhone.slice(0, 3)} ${cleanPhone.slice(3, 6)} ${cleanPhone.slice(6)}`;
  }
  
  return cleanPhone;
};

export const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  
  // Remove caracteres não numéricos exceto +
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Verificar se é número português válido
  return /^\+?351\d{9}$|^\d{9}$/.test(cleanPhone);
};

/**
 * Utilitários para PropertyAlert - Novos alertas de redução de preço
 */
export const priceAlertUtils = {
  /**
   * Formatar informações do alerta
   */
  formatAlertInfo: (alert: PropertyAlert): string => {
    const parts = [];
    
    parts.push(`📍 ${alert.propertyLocation}`);
    parts.push(`💰 ${formatPrice(alert.currentPrice)}`);
    parts.push(`📉 Alerta: ${alert.alertThresholdPercentage}%`);
    
    return parts.join(' • ');
  },

  /**
   * Obter status do alerta
   */
  getAlertStatus: (alert: PropertyAlert): 'active' | 'inactive' | 'triggered' => {
    if (!alert.isActive) return 'inactive';
    if (alert.notificationCount > 0) return 'triggered';
    return 'active';
  },

  /**
   * Formatar limite do alerta
   */
  formatThreshold: (percentage: number): string => {
    return `${percentage}% ou mais`;
  },

  /**
   * Verificar se alerta teve atividade recente
   */
  hasRecentActivity: (alert: PropertyAlert): boolean => {
    if (!alert.lastTriggered) return false;
    const hoursSinceTriggered = (Date.now() - new Date(alert.lastTriggered).getTime()) / (1000 * 60 * 60);
    return hoursSinceTriggered < 24;
  },

  /**
   * Formatar última atividade
   */
  formatLastActivity: (alert: PropertyAlert): string => {
    if (!alert.lastTriggered) return 'Nunca disparado';
    
    const date = new Date(alert.lastTriggered);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Disparado recentemente';
    if (diffHours < 24) return `Disparado há ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Disparado há ${diffDays}d`;
    
    return `Disparado em ${formatDate(date)}`;
  },

  /**
   * Obter cor baseada no status
   */
  getStatusColor: (alert: PropertyAlert): string => {
    const status = priceAlertUtils.getAlertStatus(alert);
    if (status === 'triggered') return 'green';
    if (status === 'active') return 'blue';
    return 'gray';
  },

  /**
   * Calcular poupança estimada baseada no threshold
   */
  calculateEstimatedSavings: (alert: PropertyAlert): number => {
    return Math.round((alert.currentPrice * alert.alertThresholdPercentage) / 100);
  }
};

/**
 * Função auxiliar para obter iniciais de qualquer string de nome
 * Usado para compatibilidade com outros componentes
 */
export function getInitialsFromName(name: string): string {
  if (!name?.trim()) return 'U';
  
  const words = name.trim().split(' ').filter(word => word.length > 0);
  
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  return 'U';
}

/**
 * Função auxiliar para obter iniciais de email (fallback)
 */
export function getInitialsFromEmail(email: string): string {
  if (!email?.trim()) return 'U';
  
  const emailPart = email.split('@')[0];
  return emailPart.substring(0, 2).toUpperCase();
}

/**
 * Função universal para obter iniciais compatível com qualquer input
 */
export function getUniversalInitials(input: { name?: string; fullName?: string; email?: string }): string {
  // Prioridade: fullName > name > email
  const displayName = input.fullName?.trim() || input.name?.trim();
  
  if (displayName) {
    return getInitialsFromName(displayName);
  }
  
  if (input.email) {
    return getInitialsFromEmail(input.email);
  }
  
  return 'U';
}