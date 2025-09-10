import React from 'react';
import { Card, CardContent} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Search, Trash2, RefreshCw, ArrowRight } from 'lucide-react';
import type { SavedSearch, User, Property } from '../../types/PersonalArea';
import { EmptyState } from '../EmptyState';
import { formatDate, getDaysAgo, getPropertyTypeLabel } from '../../utils/PersonalArea';

interface PersonalAreaSearchesProps {
  user: User;
  savedSearches: SavedSearch[];
  onDeleteSearch: (searchId: string) => void;
  onPropertySelect: (property: Property) => void;
}

export function PersonalAreaSearches({ 
  user, 
  savedSearches, 
  onDeleteSearch, 
  onPropertySelect 
}: PersonalAreaSearchesProps) {

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
        onAction={() => {
          // Navigate to home/search
          window.location.href = '/';
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium text-foreground">As Suas Pesquisas Guardadas</h2>
          <p className="text-sm text-muted-foreground">
            {savedSearches.length} pesquisas guardadas
          </p>
        </div>
      </div>

      {/* Searches Grid */}
      <div className="grid gap-4">
        {savedSearches.map((search) => (
          <Card key={search.id} className="border border-pale-clay-deep bg-pure-white shadow-clay-soft hover:shadow-clay-medium transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-medium text-foreground">{search.name}</h3>
                    {search.newResults > 0 && (
                      <Badge className="bg-success-soft text-success-strong border-success-gentle">
                        {search.newResults} novos
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    "{search.query}"
                  </p>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-wrap gap-4 text-muted-foreground">
                      {search.filters.location && (
                        <span>📍 {search.filters.location}</span>
                      )}
                      {search.filters.propertyType && search.filters.propertyType !== 'any' && (
                        <span>🏠 {getPropertyTypeLabel(search.filters.propertyType)}</span>
                      )}
                      {search.filters.bedrooms && (
                        <span>🛏️ {search.filters.bedrooms}+ quartos</span>
                      )}
                      {search.filters.priceRange && (
                        <span>💰 €{search.filters.priceRange[0].toLocaleString()} - €{search.filters.priceRange[1].toLocaleString()}</span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 pt-2">
                      <span className="text-xs text-muted-foreground">
                        Criada em {formatDate(search.createdAt)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {search.results} propriedades encontradas
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Executar
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs p-2 text-error-gentle hover:text-error-strong"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar pesquisa guardada</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem a certeza que quer eliminar a pesquisa "{search.name}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteSearch(search.id)}
                          className="bg-error-gentle hover:bg-error-strong text-pure-white"
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
    </div>
  );
}