import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sparkles, Loader2, X } from 'lucide-react';
import { searchProperties } from '../api/properties.service';

interface AIResponseBoxProps {
  query: string;
  open: boolean;
  onClose?: () => void;
}

export function AIResponseBox({ query, open, onClose }: AIResponseBoxProps) {
  const [aiText, setAiText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const shouldQuery = useMemo(() => open && query.trim().length >= 3, [open, query]);

  useEffect(() => {
    if (!shouldQuery) {
      setAiText('');
      setLoading(false);
      setError(null);
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    const handler = setTimeout(async () => {
      try {
        const res = await searchProperties({ searchQuery: query, signal: controller.signal });
        setAiText(res.aiResponse || '');
      } catch (e: any) {
        if (e?.name !== 'AbortError') {
          setError('Não foi possível obter a resposta da IA agora.');
        }
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [query, shouldQuery]);

  if (!open) return null;

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
            {onClose && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-clay-secondary hover:text-title" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {error ? (
            <div className="text-sm text-error-strong">{error}</div>
          ) : (
            <div className="text-sm text-warm-taupe leading-relaxed whitespace-pre-wrap max-h-48 overflow-auto pr-1">
              {aiText ? aiText : (
                loading ? '': 'Descreva o que procura e a IA ajudará a interpretar a sua pesquisa.'
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
