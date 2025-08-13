import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sparkles, Search, MapPin, Filter, Star, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
    onExampleSearch: (query: string) => void;
    user: any;
}

export function WelcomeScreen({ onExampleSearch, user }: WelcomeScreenProps) {
    const exampleSearches = [
        "Casa com 3 quartos em São Paulo",
        "Apartamento moderno próximo ao metro",
        "Sobrado com piscina até R$ 800.000",
        "Cobertura com vista para o mar",
        "Casa com quintal para pets"
    ];

    return (
        <div className="space-y-8">
            {/* Main Welcome Card */}
            <Card className="border-0 shadow-lg bg-gradient-soft">
                <CardContent className="p-12 text-center">
                    <div className="mx-auto w-20 h-20 bg-gray-600 rounded-full flex items-center justify-center mb-6">
                        <Sparkles className="h-10 w-10 text-white" />
                    </div>

                    <h1 className="text-3xl font-medium text-gray-900 mb-4">
                        Bem-vindo ao HomeFinder AI
                        {user && (
                            <span className="block text-xl text-gray-600 mt-2">
                                Olá, {user.name}! ??
                            </span>
                        )}
                    </h1>

                    <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
                        Encontre sua propriedade ideal usando nossa tecnologia de busca alimentada por IA.
                        Pesquise usando linguagem natural e deixe nossa inteligência artificial encontrar as melhores opções para você.
                    </p>

                    <div className="flex justify-center gap-3 mb-8">
                        <Badge className="bg-gray-100 text-gray-700 border border-gray-200">
                            <Sparkles className="h-3 w-3 mr-1" />
                            IA Integrada
                        </Badge>
                        <Badge className="bg-gray-100 text-gray-700 border border-gray-200">
                            <MapPin className="h-3 w-3 mr-1" />
                            Mapa Interativo
                        </Badge>
                        <Badge className="bg-gray-100 text-gray-700 border border-gray-200">
                            <Filter className="h-3 w-3 mr-1" />
                            Filtros Inteligentes
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Example Searches */}
            <Card className="border border-gray-200 bg-white shadow-sm">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-gray-600 rounded-lg flex items-center justify-center">
                            <Search className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-gray-900">Experimente estas pesquisas</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600 mb-4">
                        Clique em qualquer exemplo abaixo para começar sua busca:
                    </p>
                    <div className="grid gap-3">
                        {exampleSearches.map((search, index) => (
                            <Button
                                key={index}
                                variant="outline"
                                onClick={() => onExampleSearch(search)}
                                className="justify-between text-left h-auto p-4 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                            >
                                <span className="text-gray-700">{search}</span>
                                <ArrowRight className="h-4 w-4 text-gray-400" />
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* How it Works */}
            <div className="grid md:grid-cols-3 gap-6">
                <Card className="border border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <Search className="h-6 w-6 text-gray-600" />
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2">1. Pesquise</h3>
                        <p className="text-sm text-gray-600">
                            Use linguagem natural para descrever o que você procura
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="h-6 w-6 text-gray-600" />
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2">2. IA Analisa</h3>
                        <p className="text-sm text-gray-600">
                            Nossa IA processa sua pesquisa e aplica filtros inteligentes
                        </p>
                    </CardContent>
                </Card>

                <Card className="border border-gray-200 bg-white shadow-sm">
                    <CardContent className="p-6 text-center">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                            <Star className="h-6 w-6 text-gray-600" />
                        </div>
                        <h3 className="font-medium text-gray-900 mb-2">3. Encontre</h3>
                        <p className="text-sm text-gray-600">
                            Veja resultados ranqueados pela relevância da IA
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Premium Banner for non-premium users */}
            {user && !user.isPremium && (
                <Card className="border-0 shadow-lg bg-gradient-primary text-white">
                    <CardContent className="p-8 text-center">
                        <Star className="h-8 w-8 mx-auto mb-4 text-yellow-300" />
                        <h3 className="text-xl font-medium mb-2">Descubra o Premium</h3>
                        <p className="text-gray-100 mb-6">
                            Acesse filtros avançados, alertas personalizados e análises detalhadas da IA
                        </p>
                        <Button className="bg-white text-gray-900 hover:bg-gray-100 border-0">
                            Fazer Upgrade
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}