import React from 'react';

// Tipos para análise de busca AI
export interface AISearchResult {
  extractedFilters: {
    priceRange?: [number, number];
    bedrooms?: number;
    bathrooms?: number;
    propertyType?: string;
    location?: string;
    features?: string[];
    urgency?: 'low' | 'medium' | 'high';
  };
  searchIntent: 'buy' | 'rent' | 'invest' | 'explore';
  confidence: number;
  suggestions: string[];
  naturalLanguageResponse: string;
}

export class AISearchEngine {
  // Palavras-chave para diferentes categorias
  private static readonly KEYWORDS = {
    propertyTypes: {
      'casa': 'house',
      'apartamento': 'apartment',
      'ap': 'apartment',
      'apto': 'apartment',
      'condomínio': 'condo',
      'sobrado': 'townhouse',
      'studio': 'apartment',
      'loft': 'apartment',
      'kitnet': 'apartment'
    },
    locations: {
      'centro': 'centro',
      'downtown': 'centro',
      'vila madalena': 'Vila Madalena',
      'madalena': 'Vila Madalena',
      'ipanema': 'Ipanema',
      'copacabana': 'Copacabana',
      'leblon': 'Leblon',
      'jardins': 'Jardins',
      'moema': 'Moema',
      'brooklin': 'Brooklin',
      'pinheiros': 'Pinheiros',
      'bela vista': 'Bela Vista',
      'perdizes': 'Perdizes'
    },
    features: {
      'piscina': 'Piscina',
      'academia': 'Academia',
      'garage': 'Garagem',
      'garagem': 'Garagem',
      'jardim': 'Jardim',
      'varanda': 'Varanda',
      'terraço': 'Terraço',
      'churrasqueira': 'Churrasqueira',
      'portaria 24h': 'Portaria 24h',
      'elevador': 'Elevador',
      'ar condicionado': 'Ar Condicionado',
      'vista': 'Vista',
      'vista mar': 'Vista do Mar',
      'vista cidade': 'Vista da Cidade',
      'pet friendly': 'Pet Friendly',
      'mobiliado': 'Mobiliado',
      'novo': 'Novo',
      'reformado': 'Reformado',
      'sacada': 'Sacada',
      'suite': 'Suíte',
      'lavanderia': 'Lavanderia'
    },
    priceIndicators: {
      'barato': [0, 800000],
      'econômico': [0, 800000],
      'acessível': [0, 1200000],
      'médio': [800000, 1800000],
      'alto padrão': [1500000, 3000000],
      'luxo': [2000000, 10000000],
      'premium': [2500000, 10000000],
      'caro': [2000000, 10000000]
    },
    urgencyWords: {
      'urgente': 'high',
      'rápido': 'high',
      'logo': 'medium',
      'em breve': 'medium',
      'futuramente': 'low'
    },
    intentWords: {
      'comprar': 'buy',
      'vender': 'buy',
      'alugar': 'rent',
      'investir': 'invest',
      'investimento': 'invest',
      'morar': 'buy',
      'mudar': 'buy'
    }
  };

  static analyzeQuery(query: string): AISearchResult {
    const lowerQuery = query.toLowerCase();
    const result: AISearchResult = {
      extractedFilters: {},
      searchIntent: 'explore',
      confidence: 0,
      suggestions: [],
      naturalLanguageResponse: ''
    };

    // Extrair número de quartos e banheiros
    const bedroomMatch = lowerQuery.match(/(\d+)\s*(quarto|bedroom|dormitório)/);
    if (bedroomMatch) {
      result.extractedFilters.bedrooms = parseInt(bedroomMatch[1]);
      result.confidence += 0.2;
    }

    const bathroomMatch = lowerQuery.match(/(\d+)\s*(banheiro|bathroom|lavabo)/);
    if (bathroomMatch) {
      result.extractedFilters.bathrooms = parseInt(bathroomMatch[1]);
      result.confidence += 0.2;
    }

    // Extrair tipo de propriedade
    for (const [keyword, type] of Object.entries(this.KEYWORDS.propertyTypes)) {
      if (lowerQuery.includes(keyword)) {
        result.extractedFilters.propertyType = type;
        result.confidence += 0.25;
        break;
      }
    }

    // Extrair localização
    for (const [keyword, location] of Object.entries(this.KEYWORDS.locations)) {
      if (lowerQuery.includes(keyword)) {
        result.extractedFilters.location = location;
        result.confidence += 0.2;
        break;
      }
    }

    // Extrair características
    const features: string[] = [];
    for (const [keyword, feature] of Object.entries(this.KEYWORDS.features)) {
      if (lowerQuery.includes(keyword)) {
        features.push(feature);
        result.confidence += 0.1;
      }
    }
    if (features.length > 0) {
      result.extractedFilters.features = features;
    }

    // Extrair faixa de preço
    for (const [keyword, priceRange] of Object.entries(this.KEYWORDS.priceIndicators)) {
      if (lowerQuery.includes(keyword)) {
        result.extractedFilters.priceRange = priceRange as [number, number];
        result.confidence += 0.15;
        break;
      }
    }

    // Detectar urgência
    for (const [keyword, urgency] of Object.entries(this.KEYWORDS.urgencyWords)) {
      if (lowerQuery.includes(keyword)) {
        result.extractedFilters.urgency = urgency as 'low' | 'medium' | 'high';
        result.confidence += 0.1;
        break;
      }
    }

    // Detectar intenção
    for (const [keyword, intent] of Object.entries(this.KEYWORDS.intentWords)) {
      if (lowerQuery.includes(keyword)) {
        result.searchIntent = intent as 'buy' | 'rent' | 'invest' | 'explore';
        result.confidence += 0.15;
        break;
      }
    }

    // Gerar resposta em linguagem natural
    result.naturalLanguageResponse = this.generateNaturalResponse(result, query);

    // Gerar sugestões
    result.suggestions = this.generateSuggestions(result);

    // Garantir que a confiança não exceda 1
    result.confidence = Math.min(result.confidence, 1);

    return result;
  }

  private static generateNaturalResponse(result: AISearchResult, originalQuery: string): string {
    const filters = result.extractedFilters;
    let response = "Entendi que você está procurando por ";

    if (filters.propertyType) {
      const typeNames = {
        house: 'casas',
        apartment: 'apartamentos',
        condo: 'condomínios',
        townhouse: 'sobrados'
      };
      response += typeNames[filters.propertyType as keyof typeof typeNames] || 'propriedades';
    } else {
      response += 'propriedades';
    }

    if (filters.bedrooms) {
      response += ` com ${filters.bedrooms} ${filters.bedrooms === 1 ? 'quarto' : 'quartos'}`;
    }

    if (filters.bathrooms) {
      response += ` e ${filters.bathrooms} ${filters.bathrooms === 1 ? 'banheiro' : 'banheiros'}`;
    }

    if (filters.location) {
      response += ` na região de ${filters.location}`;
    }

    if (filters.features && filters.features.length > 0) {
      response += `. Características importantes: ${filters.features.join(', ')}`;
    }

    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      response += `. Faixa de preço: R$ ${(min * 5.5).toLocaleString('pt-BR')} - R$ ${(max * 5.5).toLocaleString('pt-BR')}`;
    }

    if (result.confidence < 0.3) {
      response += ". Posso ajudar com mais detalhes se você especificar melhor suas preferências.";
    } else if (result.confidence > 0.7) {
      response += ". Encontrei várias opções que podem interessar você!";
    }

    return response;
  }

  private static generateSuggestions(result: AISearchResult): string[] {
    const suggestions: string[] = [];
    const filters = result.extractedFilters;

    if (!filters.location) {
      suggestions.push("Especifique um bairro ou região de interesse");
    }

    if (!filters.bedrooms) {
      suggestions.push("Adicione o número de quartos desejado");
    }

    if (!filters.priceRange) {
      suggestions.push("Defina seu orçamento para resultados mais precisos");
    }

    if (!filters.features || filters.features.length === 0) {
      suggestions.push("Mencione características importantes (piscina, garagem, etc.)");
    }

    if (result.searchIntent === 'explore') {
      suggestions.push("Especifique se deseja comprar, alugar ou investir");
    }

    // Sugestões baseadas no que já foi detectado
    if (filters.propertyType === 'apartment') {
      suggestions.push("Considere filtrar por andar ou vista");
    }

    if (filters.propertyType === 'house') {
      suggestions.push("Adicione preferências sobre jardim ou área externa");
    }

    return suggestions.slice(0, 3); // Limitar a 3 sugestões
  }
}