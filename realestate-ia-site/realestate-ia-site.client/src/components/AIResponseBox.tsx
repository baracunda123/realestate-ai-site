import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sparkles, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';

interface AIResponseBoxProps {
  open: boolean;
  text?: string;
  loading?: boolean;
  error?: string | null;
  onClose?: () => void;
}

export function AIResponseBox({ open, text, loading = false, error = null, onClose }: AIResponseBoxProps) {
  const [minimized, setMinimized] = useState(false);

  if (!open) return null;

  if (minimized) {
    return (
      <div className="absolute right-0 mt-2 z-50 pointer-events-none">
        <div className="flex items-center gap-1 pointer-events-auto bg-pure-white/90 backdrop-blur rounded-md border border-pale-clay-deep p-1 shadow-clay-deep">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-clay-secondary hover:text-title" onClick={() => setMinimized(false)} aria-label="Maximizar" title="Maximizar">
            <ChevronUp className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-clay-secondary hover:text-title" onClick={onClose} aria-label="Fechar">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute left-0 right-0 mt-2 z-50">
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-burnt-peach flex items-center justify-center shadow-burnt-peach">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div className="text-sm text-deep-mocha font-medium">Resposta da IA</div>
              {loading && (
                <Badge className="bg-porcelain text-cocoa-taupe border-0">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  a pensar...
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-clay-secondary hover:text-title"
                onClick={() => setMinimized(m => !m)}
                aria-label={minimized ? 'Maximizar' : 'Minimizar'}
                title={minimized ? 'Maximizar' : 'Minimizar'}
              >
                {minimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {onClose && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-clay-secondary hover:text-title" onClick={onClose} aria-label="Fechar">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {!minimized && (
            error ? (
              <div className="text-sm text-error-strong">{error}</div>
            ) : (
              <div className="text-sm text-warm-taupe leading-relaxed whitespace-pre-wrap max-h-48 overflow-auto pr-1">
                {text ? text : (
                  loading ? '' : 'Descreva o que procura e a IA ajudará a interpretar a sua pesquisa.'
                )}
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
