import React from 'react';
import { Card, CardContent} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Search, Trash2, RefreshCw } from 'lucide-react';
import type { SavedSearch } from '../../types/PersonalArea';
import { EmptyState } from '../EmptyState';
import { formatDate, getPropertyTypeLabel } from '../../utils/PersonalArea';

interface PersonalAreaSearchesProps {
  savedSearches: SavedSearch[];
  onDeleteSearch: (searchId: string) => void;
  onNavigateToHome?: () => void;
  onExecuteSearch?: (search: SavedSearch) => void;
}

export function PersonalAreaSearches({ 
  savedSearches, 
  onDeleteSearch, 
  onNavigateToHome,
  onExecuteSearch
}: PersonalAreaSearchesProps) {

  const handleDeleteSearch = (searchId: string) => {
    onDeleteSearch(searchId);
  };

  const handleNewSearch = () => {
    if (onNavigateToHome) {
      onNavigateToHome();
    } else {
      // Fallback para navegação interna sem refresh
      window.location.hash = '';
    }
  };

  const handleExecuteSearch = (search: SavedSearch) => {
    if (onExecuteSearch) {
      onExecuteSearch(search);
    } else {
      // Fallback - navegar para home com a query da pesquisa
      if (onNavigateToHome) {
        onNavigateToHome();
      } else {
        window.location.hash = '';
      }
    }
  };

  if (savedSearches.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="Nenhuma pesquisa guardada"
        description="Ainda não guardou nenhuma pesquisa. Faça uma busca e guarde-a para acompanhar novos resultados!"
        actionLabel="Fazer Nova Pesquisa"
        onAction={handleNewSearch}
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
          <Card key={search.id} className="saved-search-card border border-pale-clay-deep bg-pure-white shadow-clay-soft group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="search-icon w-10 h-10 bg-cocoa-taupe-lighter rounded-lg flex items-center justify-center">
                      <Search className="icon h-5 w-5 text-cocoa-taupe-dark" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-title">{search.name}</h3>
                        {search.newResults > 0 && (
                          <Badge className="search-badge bg-success-soft text-success-strong border-success-gentle text-xs shadow-clay-soft">
                            {search.newResults} novos
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-warm-taupe italic">
                        "{search.query}"
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex flex-wrap gap-3 text-clay-secondary">
                      {search.filters.location && (
                        <div className="flex items-center bg-pale-clay-light px-2 py-1 rounded-full">
                          <span>📍 {search.filters.location}</span>
                        </div>
                      )}
                      {search.filters.propertyType && search.filters.propertyType !== 'any' && (
                        <div className="flex items-center bg-pale-clay-light px-2 py-1 rounded-full">
                          <span>🏠 {getPropertyTypeLabel(search.filters.propertyType)}</span>
                        </div>
                      )}
                      {search.filters.bedrooms && (
                        <div className="flex items-center bg-pale-clay-light px-2 py-1 rounded-full">
                          <span>🛏️ {search.filters.bedrooms}+ quartos</span>
                        </div>
                      )}
                      {search.filters.priceRange && (
                        <div className="flex items-center bg-pale-clay-light px-2 py-1 rounded-full">
                          <span>💰 €{search.filters.priceRange[0].toLocaleString()} - €{search.filters.priceRange[1].toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between pt-2 border-t border-whisper-clay">
                      <div className="flex items-center space-x-4">
                        <span className="text-xs text-clay-secondary">
                          Criada em {formatDate(search.createdAt)}
                        </span>
                        <span className="text-xs text-clay-secondary font-medium">
                          {search.results || 0} propriedades encontradas
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="search-action-btn text-xs border-pale-clay-deep text-warm-taupe hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cocoa-taupe/20"
                    onClick={() => handleExecuteSearch(search)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Executar
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="search-delete-btn text-xs p-2 text-error-gentle hover:text-pure-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-pure-white border border-pale-clay-deep shadow-clay-deep">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-title">Eliminar pesquisa guardada</AlertDialogTitle>
                        <AlertDialogDescription className="text-warm-taupe">
                          Tem a certeza que quer eliminar a pesquisa "{search.name}"? Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-pale-clay-deep hover:bg-pale-clay-light">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteSearch(search.id)}
                          className="bg-error-gentle hover:bg-error-strong text-pure-white shadow-clay-soft"
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