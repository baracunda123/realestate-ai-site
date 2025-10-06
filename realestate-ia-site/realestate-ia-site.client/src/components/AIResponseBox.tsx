import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';

interface ConversationMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AIResponseBoxProps {
  open: boolean;
  text?: string;
  loading?: boolean;
  error?: string | null;
  userQuery?: string;
  onNewQuery?: () => void;
  onClose?: () => void;
  onReopen?: () => void;
  conversationHistory?: ConversationMessage[];
  onUpdateHistory?: (history: ConversationMessage[]) => void;
}

export function AIResponseBox({ 
  open, 
  text, 
  loading = false, 
  error = null, 
  userQuery: _userQuery,
  onNewQuery: _onNewQuery,
  onClose,
  onReopen: _onReopen,
  conversationHistory = [],
  onUpdateHistory: _onUpdateHistory
}: AIResponseBoxProps) {
  const [localHistory, setLocalHistory] = useState<ConversationMessage[]>([]);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const conversationContainerRef = useRef<HTMLDivElement>(null);
  const aiBoxRef = useRef<HTMLDivElement>(null);

  // Sync with external history (this is now the single source of truth)
  useEffect(() => {
    setLocalHistory(conversationHistory);
  }, [conversationHistory]);

  // Auto scroll within chat container only - for new messages
  useEffect(() => {
    if (open && conversationEndRef.current && conversationContainerRef.current) {
      // Only scroll if there are messages or loading
      if (localHistory.length > 0 || loading) {
        setTimeout(() => {
          if (conversationContainerRef.current && conversationEndRef.current) {
            conversationContainerRef.current.scrollTop = conversationContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    }
  }, [localHistory.length, loading, open]);

  // Scroll to bottom immediately when chat opens
  useEffect(() => {
    if (open && conversationContainerRef.current) {
      const container = conversationContainerRef.current;
      container.style.scrollBehavior = 'auto';
      container.scrollTop = container.scrollHeight;
      
      setTimeout(() => {
        if (conversationContainerRef.current) {
          conversationContainerRef.current.style.scrollBehavior = 'smooth';
        }
      }, 50);
    }
  }, [open]);

  // Handle clicks outside of the component
  useEffect(() => {
    if (!open || !onClose) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (aiBoxRef.current && aiBoxRef.current.contains(target)) {
        return;
      }
      
      const chatButton = target.closest('[aria-label="Abrir chat IA"]');
      if (chatButton) {
        return;
      }
      
      const searchInput = target.closest('input[placeholder*="procura"]');
      if (searchInput) {
        return;
      }
      
      onClose();
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const renderMessage = (message: ConversationMessage) => {
    const isUser = message.type === 'user';
    
    return (
      <div key={message.id} className={`mb-4 ${isUser ? 'ml-4' : 'mr-4'}`}>
        <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[85%] rounded-lg p-3 ${
            isUser 
              ? 'bg-pale-clay text-deep-mocha' 
              : 'bg-pure-white border border-pale-clay-deep text-warm-taupe'
          }`}>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
            <div className={`text-xs mt-1 text-clay-secondary`}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const hasHistory = localHistory.length > 0;
  const showConversationMode = hasHistory;

  return (
    <div 
      ref={aiBoxRef}
      className="absolute left-0 right-0 mt-2 z-50"
    >
      <Card className="border border-pale-clay-deep bg-pure-white shadow-clay-deep overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
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

          {showConversationMode ? (
            <div 
              ref={conversationContainerRef}
              className="max-h-96 overflow-auto pr-1"
            >
              <div className="space-y-1">
                {localHistory.map(renderMessage)}
                
                {loading && (
                  <div className="mb-4 mr-4">
                    <div className="flex gap-3 justify-start">
                      <div className="max-w-[85%] rounded-lg p-3 bg-pure-white border border-pale-clay-deep">
                        <div className="flex items-center gap-2 text-sm text-warm-taupe">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mb-4 mr-4">
                    <div className="flex gap-3 justify-start">
                      <div className="max-w-[85%] rounded-lg p-3 bg-pure-white border border-pale-clay-deep">
                        <div className="text-sm text-error-strong">
                          {error}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={conversationEndRef} />
              </div>
            </div>
          ) : (
            <div className="text-sm text-warm-taupe leading-relaxed whitespace-pre-wrap max-h-48 overflow-auto pr-1">
              {error ? (
                <div className="text-error-strong">{error}</div>
              ) : text ? (
                text
              ) : loading ? (
                ''
              ) : (
                'Descreva o que procura e a IA ajudará a interpretar a sua pesquisa.'
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
