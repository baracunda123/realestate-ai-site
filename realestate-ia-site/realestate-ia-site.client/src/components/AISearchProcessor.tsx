import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Brain, Sparkles, CheckCircle } from 'lucide-react';

interface AISearchProcessorProps {
    aiResponse?: string | null; // texto já vindo da IA
    isLoading?: boolean; // mostrar skeleton/loader
}

export function AISearchProcessor({
    aiResponse,
    isLoading,
}: AISearchProcessorProps) {
    const confidence = 0.82; // simulação

    const getConfidenceColor = (c: number) => {
        if (c >= 0.7) return 'bg-gray-200 text-gray-800';
        if (c >= 0.4) return 'bg-gray-100 text-gray-700';
        return 'bg-gray-50 text-gray-600';
    };

    const getConfidenceText = (c: number) => {
        if (c >= 0.7) return 'Alta confiança';
        if (c >= 0.4) return 'Média confiança';
        return 'Baixa confiança';
    };

    return (
        <div className="space-y-4">
            {isLoading ? (
                <Card className="border border-slate-200 bg-slate-50">
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center animate-pulse">
                                <Brain className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-slate-800">
                                        Analisando sua busca com IA...
                                    </span>
                                    <div className="flex space-x-1">
                                        <div className="w-1 h-1 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1 h-1 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1 h-1 bg-slate-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-600 mt-1">
                                    Processando linguagem natural...
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border border-slate-200 bg-white shadow-sm">
                    <CardContent className="p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-slate-600 rounded-lg flex items-center justify-center">
                                    <Sparkles className="h-4 w-4 text-white" />
                                </div>
                                <span className="font-semibold text-slate-800">Análise de IA Concluída</span>
                            </div>
                            <Badge className={getConfidenceColor(confidence)}>
                                {getConfidenceText(confidence)} ({Math.round(confidence * 100)}%)
                            </Badge>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-800">{aiResponse}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
