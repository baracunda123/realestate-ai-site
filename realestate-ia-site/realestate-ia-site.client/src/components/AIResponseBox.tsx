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
  conversationHistory?: ConversationMessage[];
  onUpdateHistory?: (history: ConversationMessage[]) => void;
}

export function AIResponseBox({ 
  open, 
  text, 
  loading = false, 
  error = null, 
  userQuery,
  conversationHistory = [],
  onUpdateHistory
}: AIResponseBoxProps) {
  const [localHistory, setLocalHistory] = useState<ConversationMessage[]>([]);
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const conversationContainerRef = useRef<HTMLDivElement>(null);

  // Add user query to history
  useEffect(() => {
    if (userQuery && onUpdateHistory) {
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: userQuery,
        timestamp: new Date()
      };
      
      const newHistory = [...conversationHistory, userMessage];
      setLocalHistory(newHistory);
      onUpdateHistory(newHistory);
    }
  }, [userQuery]);

  // Add AI response to history
  useEffect(() => {
    if (text && !loading && !error && onUpdateHistory) {
      const aiMessage: ConversationMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: text,
        timestamp: new Date()
      };
      
      const newHistory = [...conversationHistory, aiMessage];
      setLocalHistory(newHistory);
      onUpdateHistory(newHistory);
    }
  }, [text, loading, error]);

  // Sync with external history
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
  }, [localHistory.length, loading]);

  // Scroll to bottom immediately when chat opens - use container scroll
  useEffect(() => {
    if (open && conversationContainerRef.current) {
      // Scroll to bottom immediately when opening - no animation
      const container = conversationContainerRef.current;
      container.style.scrollBehavior = 'auto'; // Disable smooth scrolling temporarily
      container.scrollTop = container.scrollHeight;
      
      // Re-enable smooth scrolling for future interactions
      setTimeout(() => {
        if (conversationContainerRef.current) {
          conversationContainerRef.current.style.scrollBehavior = 'smooth';
        }
      }, 50);
    }
  }, [open]);

  // Don't render anything when closed
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
  const showConversationMode = onUpdateHistory && (hasHistory || userQuery);

  return (
    <div className="absolute left-0 right-0 mt-2 z-50">
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
              {hasHistory ? (
                <div className="space-y-1">
                  {localHistory.map(renderMessage)}
                  
                  {loading && (
                    <div className="mb-4 mr-4">
                      <div className="flex gap-3 justify-start">
                        <div className="max-w-[85%] rounded-lg p-3 bg-pure-white border border-pale-clay-deep">
                          <div className="flex items-center gap-2 text-sm text-warm-taupe">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            A IA está a pensar...
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
              ) : (
                <div className="text-sm text-warm-taupe leading-relaxed text-center py-8 px-4">
                  <div className="w-12 h-12 rounded-full bg-pale-clay flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="h-6 w-6 text-burnt-peach" />
                  </div>
                  <div className="font-medium text-deep-mocha mb-1">Bem-vindo ao Chat IA</div>
                  <div>Descreva o que procura e a IA ajudará a interpretar a sua pesquisa.</div>
                </div>
              )}
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
