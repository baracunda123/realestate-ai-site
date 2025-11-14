import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sparkles, Loader2, Send, Square } from 'lucide-react';
import { ChatQuotaBanner } from './Chat/ChatQuotaBanner';
import { ChatTabs } from './Chat/ChatTabs';
import type { ChatSessionDto } from '../api/chat-sessions.service';

interface ConversationMessage {
    id: string;
    type: 'user' | 'ai' | 'error';
    content: string;
    timestamp: Date;
    isQuotaError?: boolean;
}

interface ChatPanelProps {
    onSubmitQuery: (query: string, sessionId?: string) => Promise<void>;
    onCancelQuery?: () => void;
    loading?: boolean;
    error?: string | null;
    conversationHistory?: ConversationMessage[];
    // Tabs support
    sessions?: ChatSessionDto[];
    activeSessionId?: string | null;
    onSelectSession?: (sessionId: string) => void;
    onCreateSession?: () => void;
    onDeleteSession?: (sessionId: string) => void;
}

export function ChatPanel({
    onSubmitQuery,
    onCancelQuery,
    loading = false,
    error = null,
    conversationHistory = [],
    sessions = [],
    activeSessionId = null,
    onSelectSession,
    onCreateSession,
    onDeleteSession
}: ChatPanelProps) {
    const [inputValue, setInputValue] = useState('');
    const [localHistory, setLocalHistory] = useState<ConversationMessage[]>([]);
    const [refreshQuota, setRefreshQuota] = useState(0);
    const conversationEndRef = useRef<HTMLDivElement>(null);
    const conversationContainerRef = useRef<HTMLDivElement>(null);

    // Sync with external history
    useEffect(() => {
        setLocalHistory(conversationHistory);
    }, [conversationHistory]);

    // Auto scroll to bottom on new messages
    useEffect(() => {
        if (conversationEndRef.current && conversationContainerRef.current) {
            setTimeout(() => {
                if (conversationContainerRef.current) {
                    conversationContainerRef.current.scrollTop = conversationContainerRef.current.scrollHeight;
                }
            }, 100);
        }
    }, [localHistory.length, loading]);

    // Garantir scroll suave
    useEffect(() => {
        if (conversationContainerRef.current) {
            conversationContainerRef.current.style.scrollBehavior = 'smooth';
        }
    }, []);

    const handleSubmit = async () => {
        const query = inputValue.trim();
        if (!query || loading) return;

        setInputValue('');

        try {
            await onSubmitQuery(query, activeSessionId || undefined);
            // Refresh quota banner após mensagem enviada
            setRefreshQuota(prev => prev + 1);
        } catch (err) {
            // Erros são tratados pelo componente pai e mostrados no histórico
            console.error('Erro ao enviar mensagem:', err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };


    const renderMessage = (message: ConversationMessage) => {
        const isUser = message.type === 'user';
        const isError = message.type === 'error';
        
        // Detectar se é mensagem de erro de quota
        const isQuotaErrorMessage = !isUser && (message.isQuotaError || message.content.includes('limite de mensagens'));

        return (
            <div key={message.id} className={`mb-4 ${isUser ? 'ml-4' : 'mr-4'}`}>
                <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg p-4 ${
                        isUser
                            ? 'bg-burnt-peach text-pure-white'
                            : isError
                                ? 'bg-error-soft border border-error-gentle text-error-strong'
                                : isQuotaErrorMessage
                                    ? 'bg-warning-soft border border-warning-gentle text-warning-strong'
                                    : 'bg-pale-clay-light border border-pale-clay-deep text-deep-mocha'
                        }`}>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {message.content}
                        </div>
                        <div className={`text-xs mt-2 opacity-70`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const hasMessages = localHistory.length > 0;

    // Verificar se há erro de quota no histórico ou se é erro de quota genérico
    const hasQuotaErrorInHistory = localHistory.some(msg => 
        msg.isQuotaError || 
        msg.content.toLowerCase().includes('limite de mensagens') ||
        msg.content.toLowerCase().includes('atingiu o limite')
    );
    const hasQuotaError = hasQuotaErrorInHistory || Boolean(error && error.toLowerCase().includes('limite'));

    return (
        <div className="flex flex-col sticky top-20 lg:top-24 space-y-3">
            {/* Quota Banner */}
            <ChatQuotaBanner key={refreshQuota} />

            <Card className="flex flex-col border border-pale-clay-deep bg-pure-white shadow-clay-deep overflow-hidden h-[500px]">
                {/* Tabs */}
                {onSelectSession && onCreateSession && onDeleteSession && (
                    <ChatTabs
                        sessions={sessions}
                        activeSessionId={activeSessionId}
                        onSelectSession={onSelectSession}
                        onCreateSession={onCreateSession}
                        onDeleteSession={onDeleteSession}
                        loading={loading}
                    />
                )}

                {/* Messages Area */}
                <CardContent className="flex-1 overflow-hidden p-0 relative">
                    <div
                        ref={conversationContainerRef}
                        className="h-full overflow-y-auto p-3 sm:p-4 scrollbar-thin scrollbar-thumb-pale-clay-deep scrollbar-track-transparent hover:scrollbar-thumb-pale-clay-darker scroll-smooth"
                        style={{
                            scrollBehavior: 'smooth',
                            overscrollBehavior: 'contain'
                        }}
                    >
                        {!hasMessages && !loading && (
                            <div className="flex items-center justify-center h-full text-center px-4">
                                <div className="max-w-md space-y-3 sm:space-y-4">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto bg-pale-clay-light rounded-full flex items-center justify-center">
                                        <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-burnt-peach" />
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-medium text-deep-mocha mb-2">
                                            Como posso ajudar?
                                        </h3>
                                        <p className="text-xs sm:text-sm text-warm-taupe">
                                            Descreve o tipo de imóvel que procuras e a AI vai-te ajudar a encontrar as melhores opções.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {hasMessages && (
                            <div className="space-y-1">
                                {localHistory.map(renderMessage)}

                                {loading && (
                                    <div className="mb-4 mr-4">
                                        <div className="flex gap-3 justify-start">
                                            <div className="max-w-[85%] rounded-lg p-4 bg-pale-clay-light border border-pale-clay-deep">
                                                <div className="flex items-center gap-2 text-sm text-warm-taupe">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    A pensar...
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={conversationEndRef} />
                            </div>
                        )}
                    </div>
                </CardContent>

                {/* Input Area */}
                <div className="p-3 sm:p-4 border-t border-pale-clay-deep bg-pale-clay-light/30">
                    <div className="flex gap-2">
                        <Input
                            placeholder={hasQuotaError ? "Limite atingido - Faça upgrade para continuar" : "Descreva o que procura..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading || hasQuotaError}
                            className="flex-1 border-pale-clay-deep focus:border-burnt-peach text-sm"
                        />
                        {loading && onCancelQuery ? (
                            <Button
                                onClick={onCancelQuery}
                                className="bg-error-gentle hover:bg-error-strong text-pure-white font-semibold border-0 shadow-clay-soft px-3 sm:px-4 transition-colors"
                                title="Cancelar mensagem"
                            >
                                <Square className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSubmit}
                                disabled={!inputValue.trim() || loading || hasQuotaError}
                                className="bg-burnt-peach hover:bg-burnt-peach-light text-pure-white font-semibold border-0 shadow-burnt-peach px-3 sm:px-4"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </Card>
        </div>
    );
}


