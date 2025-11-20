import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Loader2, ArrowUp, Square, ArrowRight } from 'lucide-react';
import { AnonymousBanner } from './Chat/AnonymousBanner';
import { ChatTabs } from './Chat/ChatTabs';
import type { ChatSessionDto } from '../api/chat-sessions.service';
import { authUtils } from '../api/auth.service';

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
    onOpenAuthModal?: () => void;
    // Mobile navigation
    onShowResults?: () => void;
    showResultsButton?: boolean;
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
    onDeleteSession,
    onOpenAuthModal,
    onShowResults,
    showResultsButton = false
}: ChatPanelProps) {
    const [inputValue, setInputValue] = useState('');
    const [localHistory, setLocalHistory] = useState<ConversationMessage[]>([]);
    const conversationEndRef = useRef<HTMLDivElement>(null);
    const conversationContainerRef = useRef<HTMLDivElement>(null);
    const isComposingRef = useRef(false);

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
        } catch (err) {
            // Erros são tratados pelo componente pai e mostrados no histórico
            console.error('Erro ao enviar mensagem:', err);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Proteção IME: Não processar Enter se estiver em modo de composição
        // Previne envio acidental quando utilizador seleciona autocomplete/sugestão em teclados mobile
        if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
            e.preventDefault();
            handleSubmit();
        }
    };


    const renderMessage = (message: ConversationMessage, index: number) => {
        const isUser = message.type === 'user';
        const isError = message.type === 'error';
        const isLastAiMessage = !isUser && index === localHistory.length - 1;
        
        // Detectar se é mensagem de erro de quota
        const isQuotaErrorMessage = !isUser && (message.isQuotaError || message.content.includes('limite de mensagens'));

        return (
            <div key={message.id} className={`mb-5 ${isUser ? 'ml-8' : 'mr-8'}`}>
                <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${
                        isUser
                            ? 'bg-primary text-primary-foreground shadow-blue'
                            : isError
                                ? 'bg-error/10 border-2 border-error text-error'
                                : isQuotaErrorMessage
                                    ? 'bg-warning/10 border-2 border-warning text-warning'
                                    : 'bg-card border-2 border-border text-foreground shadow-medium'
                        }`}>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {message.content}
                        </div>
                        <div className={`flex items-center justify-between mt-2 ${isUser ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            <span className="text-xs">
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {/* Seta para ver resultados - apenas na última mensagem da IA */}
                            {isLastAiMessage && showResultsButton && onShowResults && (
                                <Button
                                    onClick={onShowResults}
                                    size="sm"
                                    variant="ghost"
                                    className="lg:hidden h-7 px-2 text-xs text-accent hover:text-accent/90 hover:bg-accent/10"
                                >
                                    Ver Resultados
                                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                </Button>
                            )}
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

    const isAuthenticated = authUtils.isAuthenticated();

    return (
        <div className="flex flex-col h-full">
            {/* Free Plan Banner - mostrar apenas para utilizadores não autenticados */}
            {!isAuthenticated && onOpenAuthModal && (
                <div className="p-4 border-b border-border">
                    <AnonymousBanner onSignUp={onOpenAuthModal} />
                </div>
            )}

            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Tabs - apenas para utilizadores autenticados */}
                {isAuthenticated && onSelectSession && onCreateSession && onDeleteSession && (
                    <div className="p-4 border-b border-border bg-card">
                        <ChatTabs
                            sessions={sessions}
                            activeSessionId={activeSessionId}
                            onSelectSession={onSelectSession}
                            onCreateSession={onCreateSession}
                            onDeleteSession={onDeleteSession}
                            loading={loading}
                        />
                    </div>
                )}

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden p-0 relative bg-background">
                    <div
                        ref={conversationContainerRef}
                        className="h-full overflow-y-auto p-4 sm:p-6 scrollbar-thin"
                        style={{
                            scrollBehavior: 'smooth',
                            overscrollBehavior: 'contain',
                            overflowAnchor: 'none'
                        }}
                    >
                        {!hasMessages && !loading && (
                            <div className="flex items-center justify-center h-full text-center px-6">
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    Descreve o imóvel que procuras e a IA vai encontrar as melhores opções para ti
                                </p>
                            </div>
                        )}

                        {hasMessages && (
                            <div className="space-y-1">
                                {localHistory.map(renderMessage)}

                                {loading && (
                                    <div className="mb-4 mr-4">
                                        <div className="flex gap-3 justify-start">
                                            <div className="max-w-[85%] rounded-lg p-3 bg-card border border-border">
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                                                    A processar...
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={conversationEndRef} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Area - Estilo ChatGPT */}
                <div className="p-4 bg-card border-t border-border">
                    <div className="relative max-w-4xl mx-auto">
                        <div className="flex items-end gap-2 bg-input border border-border hover:border-accent rounded-2xl shadow-sm transition-all px-4 py-3">
                            <Input
                                placeholder={hasQuotaError ? "Limite atingido" : "Descreve o imóvel que procuras..."}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onCompositionStart={() => {
                                    isComposingRef.current = true;
                                }}
                                onCompositionEnd={() => {
                                    isComposingRef.current = false;
                                }}
                                disabled={loading || hasQuotaError}
                                className="flex-1 border-0 focus:ring-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm bg-transparent placeholder:text-muted-foreground resize-none"
                                style={{ boxShadow: 'none' }}
                            />
                            {loading && onCancelQuery ? (
                                <Button
                                    onClick={onCancelQuery}
                                    size="icon"
                                    className="h-8 w-8 rounded-lg bg-muted hover:bg-error/20 text-muted-foreground hover:text-error transition-colors flex-shrink-0"
                                    title="Cancelar"
                                >
                                    <Square className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={!inputValue.trim() || loading || hasQuotaError}
                                    size="icon"
                                    className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                >
                                    <ArrowUp className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}