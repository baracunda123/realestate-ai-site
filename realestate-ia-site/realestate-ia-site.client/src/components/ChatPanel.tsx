import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Sparkles, Loader2, Send, Trash2 } from 'lucide-react';
import { clearConversationContext } from '../api/properties.service';
import { ChatQuotaBanner } from './Chat/ChatQuotaBanner';

interface ConversationMessage {
    id: string;
    type: 'user' | 'ai' | 'error';
    content: string;
    timestamp: Date;
    isQuotaError?: boolean;
}

interface ChatPanelProps {
    onSubmitQuery: (query: string) => Promise<void>;
    loading?: boolean;
    error?: string | null;
    conversationHistory?: ConversationMessage[];
    onClearConversation?: () => void;
}

export function ChatPanel({
    onSubmitQuery,
    loading = false,
    error = null,
    conversationHistory = [],
    onClearConversation
}: ChatPanelProps) {
    const [inputValue, setInputValue] = useState('');
    const [localHistory, setLocalHistory] = useState<ConversationMessage[]>([]);
    const [isClearing, setIsClearing] = useState(false);
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
            await onSubmitQuery(query);
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

    const handleClearChat = async () => {
        setIsClearing(true);
        try {
            await clearConversationContext();
            setLocalHistory([]);
            setInputValue('');

            if (onClearConversation) {
                onClearConversation();
            }
        } catch (error) {
            console.error('Erro ao limpar conversa:', error);
        } finally {
            setIsClearing(false);
        }
    };

    const renderMessage = (message: ConversationMessage) => {
        const isUser = message.type === 'user';
        const isError = message.type === 'error';
        
        // Detectar se é mensagem de erro de quota
        const isQuotaErrorMessage = !isUser && message.content.includes('limite de mensagens');

        return (
            <div key={message.id} className={`mb-4 ${isUser ? 'ml-4' : 'mr-4'}`}>
                <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-lg p-4 ${
                        isUser
                            ? 'bg-burnt-peach text-deep-mocha'
                            : isError
                                ? 'bg-error-bg border border-error-strong text-error-strong'
                                : isQuotaErrorMessage
                                    ? 'bg-warning-soft border border-warning-gentle text-warning-strong'
                                    : 'bg-pure-white border border-pale-clay-deep text-warm-taupe'
                        }`}>
                        <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {message.content}
                        </div>
                        <div className={`text-xs mt-2 ${
                            isUser 
                                ? 'text-deep-mocha/70' 
                                : isError 
                                    ? 'text-error-strong/70' 
                                    : isQuotaErrorMessage
                                        ? 'text-warning-strong/70'
                                        : 'text-clay-secondary'
                            }`}>
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
                {/* Header */}
                <div className="p-3 sm:p-4 border-b border-pale-clay-deep bg-pale-clay-light/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-burnt-peach flex items-center justify-center shadow-burnt-peach">
                                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </div>
                            <div>
                                <h2 className="text-base sm:text-lg font-semibold text-deep-mocha">Chat IA</h2>
                                <p className="text-xs text-warm-taupe hidden sm:block">Assistente de Imobiliário</p>
                            </div>
                        </div>
                        {hasMessages && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearChat}
                                disabled={isClearing || loading}
                                className="text-warm-taupe hover:text-deep-mocha hover:bg-pale-clay-light text-xs sm:text-sm"
                            >
                                {isClearing ? (
                                    <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2 animate-spin" />
                                ) : (
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                                )}
                                <span className="hidden sm:inline">Limpar</span>
                            </Button>
                        )}
                    </div>
                </div>

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
                                            Descreva o tipo de propriedade que procura e a IA ajudará a encontrar as melhores opções.
                                        </p>
                                    </div>
                                    <div className="space-y-2 text-left">
                                        <p className="text-xs font-medium text-warm-taupe">Exemplos:</p>
                                        <div className="space-y-1">
                                            {[
                                                'Procuro um apartamento T2 no Porto',
                                                'Moradia com jardim até 300.000€',
                                                'Casa perto da praia com 3 quartos'
                                            ].map((example, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setInputValue(example)}
                                                    className="w-full text-left text-xs p-2 rounded-lg bg-pale-clay-light hover:bg-pale-clay text-warm-taupe hover:text-deep-mocha transition-colors"
                                                >
                                                    {example}
                                                </button>
                                            ))}
                                        </div>
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
                                            <div className="max-w-[85%] rounded-lg p-4 bg-pure-white border border-pale-clay-deep">
                                                <div className="flex items-center gap-2 text-sm text-warm-taupe">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    A pensar...
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Mostrar erro genérico apenas se não estiver no histórico */}
                                {error && !hasQuotaErrorInHistory && (
                                    <div className="mb-4 mr-4">
                                        <div className="flex gap-3 justify-start">
                                            <div className="max-w-[85%] rounded-lg p-4 bg-pure-white border border-pale-clay-deep">
                                                <div className="text-sm text-error-strong break-words">
                                                    {error}
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
                    {loading && (
                        <Badge className="bg-porcelain text-cocoa-taupe border-0 mb-2 sm:mb-3 text-xs">
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            A processar...
                        </Badge>
                    )}

                    <div className="flex gap-2">
                        <Input
                            placeholder={hasQuotaError ? "Limite atingido - Faça upgrade para continuar" : "Descreva o que procura..."}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading || isClearing || hasQuotaError}
                            className="flex-1 border-pale-clay-deep focus:border-burnt-peach text-sm"
                        />
                        <Button
                            onClick={handleSubmit}
                            disabled={!inputValue.trim() || loading || isClearing || hasQuotaError}
                            className="bg-burnt-peach hover:bg-burnt-peach-light text-deep-mocha font-semibold border-0 shadow-burnt-peach px-3 sm:px-4"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}


