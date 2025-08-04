import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Brain, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  Lightbulb,
  Wand2,
  TrendingUp
} from 'lucide-react';
import { AISearchEngine } from './AISearchEngine';
import type { AISearchResult } from './AISearchEngine';
import type { SearchFilters } from '../App';

interface AISearchProcessorProps {
  searchQuery: string;
  onFiltersUpdate: (filters: Partial<SearchFilters>) => void;
  onSearchQueryUpdate: (query: string) => void;
}

export function AISearchProcessor({ searchQuery, onFiltersUpdate, onSearchQueryUpdate }: AISearchProcessorProps) {
  const [aiResult, setAiResult] = useState<AISearchResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length > 3) {
      setIsProcessing(true);
      
      // Simular delay de processamento AI
      const timeout = setTimeout(() => {
        const result = AISearchEngine.analyzeQuery(searchQuery);
        setAiResult(result);
        setIsProcessing(false);
        setShowSuggestions(true);
      }, 800);

      return () => clearTimeout(timeout);
    } else {
      setAiResult(null);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  const applyAIFilters = () => {
    if (!aiResult) return;

    const newFilters: Partial<SearchFilters> = {};

    if (aiResult.extractedFilters.priceRange) {
      newFilters.priceRange = aiResult.extractedFilters.priceRange;
    }

    if (aiResult.extractedFilters.bedrooms) {
      newFilters.bedrooms = aiResult.extractedFilters.bedrooms;
    }

    if (aiResult.extractedFilters.bathrooms) {
      newFilters.bathrooms = aiResult.extractedFilters.bathrooms;
    }

    if (aiResult.extractedFilters.propertyType) {
      newFilters.propertyType = aiResult.extractedFilters.propertyType;
    }

    if (aiResult.extractedFilters.location) {
      newFilters.location = aiResult.extractedFilters.location;
    }

    onFiltersUpdate(newFilters);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return 'from-emerald-500 to-green-500';
    if (confidence >= 0.4) return 'from-amber-500 to-orange-500';
    return 'from-gray-500 to-gray-600';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.7) return 'Alta confiança';
    if (confidence >= 0.4) return 'Média confiança';
    return 'Baixa confiança';
  };

  if (!searchQuery.trim() || (!isProcessing && !aiResult)) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Processing Indicator */}
      {isProcessing && (
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-purple/5">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-purple-600 rounded-lg flex items-center justify-center animate-pulse">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">Analisando sua busca com IA...</span>
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-1">Processando linguagem natural e extraindo preferências...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Results */}
      {aiResult && showSuggestions && (
        <Card className="border-2 border-primary/20 bg-gradient-to-br from-white to-primary/5 shadow-lg">
          <CardContent className="p-5 space-y-4">
            {/* Header with confidence */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-primary to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-gray-900">Análise de IA Concluída</span>
              </div>
              <Badge className={`bg-gradient-to-r ${getConfidenceColor(aiResult.confidence)} text-white border-0`}>
                {getConfidenceText(aiResult.confidence)} ({Math.round(aiResult.confidence * 100)}%)
              </Badge>
            </div>

            {/* Natural Language Response */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-800">{aiResult.naturalLanguageResponse}</p>
              </div>
            </div>

            {/* Extracted Filters */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Wand2 className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-900">Filtros Detectados:</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {aiResult.extractedFilters.propertyType && (
                  <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0">
                    Tipo: {
                      aiResult.extractedFilters.propertyType === 'house' ? 'Casa' :
                      aiResult.extractedFilters.propertyType === 'apartment' ? 'Apartamento' :
                      aiResult.extractedFilters.propertyType === 'condo' ? 'Condomínio' :
                      aiResult.extractedFilters.propertyType === 'townhouse' ? 'Sobrado' :
                      aiResult.extractedFilters.propertyType
                    }
                  </Badge>
                )}
                
                {aiResult.extractedFilters.bedrooms && (
                  <Badge className="bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0">
                    {aiResult.extractedFilters.bedrooms} {aiResult.extractedFilters.bedrooms === 1 ? 'Quarto' : 'Quartos'}
                  </Badge>
                )}
                
                {aiResult.extractedFilters.bathrooms && (
                  <Badge className="bg-gradient-to-r from-purple-500 to-violet-500 text-white border-0">
                    {aiResult.extractedFilters.bathrooms} {aiResult.extractedFilters.bathrooms === 1 ? 'Banheiro' : 'Banheiros'}
                  </Badge>
                )}
                
                {aiResult.extractedFilters.location && (
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
                    Local: {aiResult.extractedFilters.location}
                  </Badge>
                )}

                {aiResult.extractedFilters.priceRange && (
                  <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0">
                    Preço: R$ {(aiResult.extractedFilters.priceRange[0] * 5.5).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} - 
                    R$ {(aiResult.extractedFilters.priceRange[1] * 5.5).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </Badge>
                )}

                {aiResult.extractedFilters.features && aiResult.extractedFilters.features.map((feature, index) => (
                  <Badge key={index} className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={applyAIFilters}
                className="bg-gradient-to-r from-primary to-purple-600 text-white border-0 hover:shadow-md transition-all duration-200"
                size="sm"
              >
                <Sparkles className="h-3 w-3 mr-1" />
                Aplicar Filtros IA
              </Button>
              
              {aiResult.suggestions.length > 0 && (
                <Button 
                  variant="outline"
                  size="sm"
                  className="border-2 border-primary/30 hover:bg-primary/5"
                  onClick={() => {
                    // Scroll para os filtros ou mostrar dicas
                    console.log('Mostrar sugestões detalhadas');
                  }}
                >
                  <Lightbulb className="h-3 w-3 mr-1" />
                  Ver Sugestões ({aiResult.suggestions.length})
                </Button>
              )}
            </div>

            {/* Suggestions */}
            {aiResult.suggestions.length > 0 && (
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Lightbulb className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-gray-900">Sugestões para Melhorar sua Busca:</span>
                </div>
                <ul className="space-y-1">
                  {aiResult.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-center space-x-2 text-xs text-gray-600">
                      <TrendingUp className="h-3 w-3 text-amber-500 flex-shrink-0" />
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Search Intent Badge */}
            {aiResult.searchIntent !== 'explore' && (
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-3 w-3 text-blue-600" />
                <span className="text-xs text-blue-600">
                  Intenção detectada: {
                    aiResult.searchIntent === 'buy' ? 'Compra' :
                    aiResult.searchIntent === 'rent' ? 'Aluguel' :
                    aiResult.searchIntent === 'invest' ? 'Investimento' :
                    'Exploração'
                  }
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}