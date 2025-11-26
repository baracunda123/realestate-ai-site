import { useMemo, useState, useEffect } from 'react';
import { PropertyCard } from './PropertyCard';
import { type Property } from '../types/property';
import { Sparkles, ArrowLeft, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

const ITEMS_PER_PAGE = 12;

interface PropertyGridProps {
  searchQuery: string;
  serverResults?: Property[];
  favorites?: Property[];
  onToggleFavorite?: (property: Property) => void;
  onPropertyView?: (property: Property) => void;
  onBackToChat?: () => void;
  showBackButton?: boolean;
}

export function PropertyGrid({ 
  searchQuery, 
  serverResults, 
  favorites = [], 
  onToggleFavorite,
  onPropertyView,
  onBackToChat,
  showBackButton = false
}: PropertyGridProps) {
  const [currentPage, setCurrentPage] = useState(1);
  
  const properties = useMemo(() => {
    // Simply return server results as-is (AI already sorted them by relevance)
    return serverResults || [];
  }, [serverResults]);

  // Reset para página 1 quando os resultados mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [serverResults]);

  // Calcular paginação
  const totalPages = Math.ceil(properties.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedProperties = properties.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-4 sm:space-y-6 relative">
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{
             backgroundImage: `radial-gradient(circle at 20% 30%, rgba(255, 140, 97, 0.4) 0%, transparent 50%),
                              radial-gradient(circle at 80% 70%, rgba(167, 139, 124, 0.3) 0%, transparent 50%),
                              radial-gradient(circle at 50% 50%, rgba(245, 122, 77, 0.2) 0%, transparent 50%)`,
             backgroundSize: '100% 100%'
           }} />
      
      {/* Results Header - responsive - mostra se houver pesquisa ou resultados */}
      {(searchQuery || properties.length > 0) && (
        <div className="flex flex-col gap-3 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-3">
              {/* Botão voltar - apenas mobile/tablet */}
              {showBackButton && onBackToChat && (
                <Button
                  onClick={onBackToChat}
                  size="sm"
                  variant="ghost"
                  className="lg:hidden h-9 px-3 text-accent hover:text-accent/90 hover:bg-accent/10"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Chat
                </Button>
              )}
              <h2 className="text-base sm:text-lg md:text-xl font-medium text-foreground">
                {properties.length} {properties.length === 1 ? 'Imóvel encontrado' : 'Imóveis encontrados'}
              </h2>
            </div>
          </div>
        </div>
      )}
      
      {/* Properties Grid - 3 por linha em desktop para melhor visualização */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 relative z-10">
        {paginatedProperties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            isFavorite={favorites.some(f => f.id === property.id)}
            onToggleFavorite={onToggleFavorite}
            onPropertyView={onPropertyView}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6 pb-4 relative z-10">
          {/* Previous Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-9 px-3 border-border hover:bg-accent/10 hover:border-accent disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Mostrar: primeira, última, atual, e 1 de cada lado da atual
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - currentPage) <= 1) return true;
                return false;
              })
              .map((page, index, filteredPages) => {
                // Adicionar ellipsis se houver gap
                const prevPage = filteredPages[index - 1];
                const showEllipsis = prevPage && page - prevPage > 1;
                
                return (
                  <div key={page} className="flex items-center gap-1">
                    {showEllipsis && (
                      <span className="px-2 text-muted-foreground">...</span>
                    )}
                    <Button
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className={`h-9 w-9 p-0 ${
                        currentPage === page 
                          ? 'bg-accent text-accent-foreground font-semibold hover:bg-accent/90' 
                          : 'border-border hover:bg-accent/10 hover:border-accent'
                      }`}
                    >
                      {page}
                    </Button>
                  </div>
                );
              })}
          </div>

          {/* Next Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-9 px-3 border-border hover:bg-accent/10 hover:border-accent disabled:opacity-50"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Page Info */}
          <span className="ml-4 text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
        </div>
      )}
      
      {/* Empty state */}
      {paginatedProperties.length === 0 && properties.length === 0 && (
        <div className="flex items-center justify-center min-h-[70vh]">
          {searchQuery ? (
            // Estado quando há pesquisa mas sem resultados
            <div className="text-center px-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-accent" />
              </div>
              <p className="text-foreground mb-2 text-sm sm:text-base">Nenhum imóvel encontrado</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Tenta ajustar os seus filtros ou termos de pesquisa</p>
            </div>
          ) : (
            // Estado inicial - apenas ícone de casa
            <Home className="h-32 w-32 sm:h-40 sm:w-40 text-muted-foreground/20" strokeWidth={1} />
          )}
        </div>
      )}
    </div>
  );
}