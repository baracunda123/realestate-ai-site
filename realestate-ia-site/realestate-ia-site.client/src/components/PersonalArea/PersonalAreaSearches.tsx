import React from 'react';
import { Card, CardContent} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Search, Crown, Trash2, RefreshCw, ArrowRight } from 'lucide-react';
import type { SavedSearch, User } from '../../types/PersonalArea';
import { EmptyState } from '../EmptyState';
import { getCurrentLimits, formatDate, getDaysAgo, getPropertyTypeLabel } from '../../utils/PersonalArea';

interface PersonalAreaSearchesProps {
  user: User;
  savedSearches: SavedSearch[];
  onDeleteSearch: (searchId: string) => void;
  onOpenUpgradeModal?: () => void;
  onGoToHome: () => void;
}

export function PersonalAreaSearches({ 
  user, 
  savedSearches, 
  onDeleteSearch, 
  onOpenUpgradeModal, 
  onGoToHome 
}: PersonalAreaSearchesProps) {
  const currentLimits = getCurrentLimits(user);

  const handleDeleteSearch = (searchId: string) => {
    onDeleteSearch(searchId);
  };

  if (savedSearches.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="Nenhuma pesquisa guardada"
        description="Ainda não guardou nenhuma pesquisa. Faça uma busca e guarde-a para acompanhar novos resultados!"
        actionLabel="Fazer Nova Pesquisa"
        onAction={onGoToHome}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with limits info */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-foreground">As Suas Pesquisas Guardadas</h2>
          <p className="text-sm text-muted-foreground">
            {savedSearches.length} 
            {!user.isPremium && ` de ${currentLimits.maxSavedSearches}`} pesquisas guardadas
          </p>
        </div>

        {!user.isPremium && (
          <div className="flex flex-col items-end space-y-2">
            <Badge className="bg-burnt-peach-lighter text-burnt-peach-dark border-burnt-peach-light border px-3 py-1">
              {savedSearches.length}/{currentLimits.maxSavedSearches} utilizado
            </Badge>
            <Button 
              size="sm" 
              className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white border-0 shadow-clay-soft px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:shadow-clay-medium hover:scale-[1.02]"
              onClick={onOpenUpgradeModal}
            >
              <Crown className="h-3 w-3 mr-2" />
              Upgrade para Ilimitadas
            </Button>
          </div>
        )}
      </div>

      {/* Searches List */}
      <div className="space-y-4">
        {savedSearches.map((savedSearch) => (
          <Card key={savedSearch.id} className="border border-pale-clay-deep bg-pure-white shadow-clay-soft">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-10 h-10 bg-pale-clay-light rounded-lg flex items-center justify-center border border-pale-clay-deep">
                      <Search className="h-5 w-5 text-cocoa-taupe" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{savedSearch.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Criada em {formatDate(savedSearch.createdAt)} • {getDaysAgo(savedSearch.createdAt)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="ml-13 space-y-2">
                    <p className="text-sm text-warm-taupe">"{savedSearch.query}"</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {savedSearch.filters.location && (
                        <Badge className="bg-pale-clay-light text-cocoa-taupe border-0">
                          📍 {savedSearch.filters.location}
                        </Badge>
                      )}
                      {savedSearch.filters.propertyType && (
                        <Badge className="bg-pale-clay-light text-cocoa-taupe border-0">
                          🏠 {getPropertyTypeLabel(savedSearch.filters.propertyType)}
                        </Badge>
                      )}
                      {savedSearch.filters.bedrooms && (
                        <Badge className="bg-pale-clay-light text-cocoa-taupe border-0">
                          🛏️ {savedSearch.filters.bedrooms} quartos
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="text-muted-foreground">
                        {savedSearch.results} propriedades encontradas
                      </span>
                      {savedSearch.newResults > 0 && (
                        <Badge className="bg-burnt-peach text-pure-white border-0">
                          {savedSearch.newResults} novas
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-pale-clay-deep hover:bg-pale-clay-light"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Atualizar
                  </Button>
                  
                  <Button
                    size="sm"
                    className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white"
                  >
                    <ArrowRight className="h-3 w-3 mr-1" />
                    Ver Resultados
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-error-gentle hover:bg-error-soft text-error-strong"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar Pesquisa Guardada</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem a certeza de que deseja eliminar a pesquisa "{savedSearch.name}"? 
                          Esta acção não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-error-gentle hover:bg-error-strong"
                          onClick={() => handleDeleteSearch(savedSearch.id)}
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Limit reached warning for Free users */}
      {!user.isPremium && savedSearches.length >= currentLimits.maxSavedSearches && (
        <Card className="border border-burnt-peach-light bg-burnt-peach-lighter/10 shadow-clay-soft">
          <CardContent className="p-6 text-center">
            <Search className="h-12 w-12 text-burnt-peach mx-auto mb-4" />
            <h3 className="font-medium text-foreground mb-2">Limite de Pesquisas Atingido</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Atingiu o limite de {currentLimits.maxSavedSearches} pesquisa guardada do plano Gratuito. 
              Faça upgrade para guardar pesquisas ilimitadas!
            </p>
            <Button 
              className="bg-burnt-peach hover:bg-burnt-peach-deep text-pure-white"
              onClick={onOpenUpgradeModal}
            >
              <Crown className="h-4 w-4 mr-2" />
              Fazer Upgrade
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}