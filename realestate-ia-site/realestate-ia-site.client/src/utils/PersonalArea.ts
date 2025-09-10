import type { User, PropertyAlert, SavedSearch } from '../types/PersonalArea';

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
    console.error('Error formatting date:', error);
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
    console.error('Error formatting date:', error);
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
 * Utilitários para PropertyAlert
 */
export const alertUtils = {
  formatCriteria: (alert: PropertyAlert): string => {
    const criteria = [];
    
    if (alert.location) criteria.push(`📍 ${alert.location}`);
    if (alert.propertyType && alert.propertyType !== 'any') {
      criteria.push(`🏠 ${getPropertyTypeLabel(alert.propertyType)}`);
    }
    if (alert.bedrooms) criteria.push(`🛏️ ${alert.bedrooms}+ quartos`);
    if (alert.bathrooms) criteria.push(`🚿 ${alert.bathrooms}+ banheiros`);
    if (alert.minPrice || alert.maxPrice) {
      criteria.push(`💰 ${formatPriceRange(alert.minPrice, alert.maxPrice)}`);
    }
    
    return criteria.join(' • ');
  },
  
  getStatusColor: (alert: PropertyAlert): string => {
    if (!alert.isActive) return 'gray';
    if (alert.newMatches > 0) return 'green';
    if (alert.matchCount > 0) return 'blue';
    return 'yellow';
  }
};

/**
 * Utilitários para SavedSearch
 */
export const searchUtils = {
  formatFilters: (search: SavedSearch): string => {
    const filters = [];
    
    if (search.filters.location) filters.push(`📍 ${search.filters.location}`);
    if (search.filters.propertyType && search.filters.propertyType !== 'any') {
      filters.push(`🏠 ${getPropertyTypeLabel(search.filters.propertyType)}`);
    }
    if (search.filters.bedrooms) filters.push(`🛏️ ${search.filters.bedrooms}+ quartos`);
    if (search.filters.priceRange) {
      const [min, max] = search.filters.priceRange;
      filters.push(`💰 ${formatPriceRange(min, max)}`);
    }
    
    return filters.join(' • ') || 'Sem filtros específicos';
  },
  
  getPerformanceLabel: (search: SavedSearch): string => {
    if (search.results === 0) return 'Nenhum resultado';
    if (search.results >= 20) return 'Muitos resultados';
    if (search.results >= 10) return 'Bons resultados';
    return 'Poucos resultados';
  }
};