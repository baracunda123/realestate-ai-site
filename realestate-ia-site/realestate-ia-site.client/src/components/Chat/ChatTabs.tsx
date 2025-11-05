import { useState } from 'react';
import { Plus, MessageSquare, ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import type { ChatSessionDto } from '../../api/chat-sessions.service';

interface ChatTabsProps {
  sessions: ChatSessionDto[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  loading?: boolean;
}

export function ChatTabs({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  loading = false
}: ChatTabsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    
    if (sessions.length <= 1) {
      return; // Nao permitir eliminar a ultima sessao
    }

    setDeletingId(sessionId);
    try {
      await onDeleteSession(sessionId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    onSelectSession(sessionId);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2 border-b border-pale-clay-deep bg-pale-clay-light/30 px-3 py-2">
      {/* Dropdown de Sessões */}
      <div className="relative flex-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading || sessions.length === 0}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-pure-white border border-pale-clay-deep hover:border-burnt-peach transition-colors text-left"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MessageSquare className="h-4 w-4 text-burnt-peach flex-shrink-0" />
            <span className="text-sm font-medium text-deep-mocha truncate">
              {sessions.length === 0 ? 'A carregar...' : (activeSession?.title || 'Selecione uma conversa')}
            </span>
          </div>
          <ChevronDown className={`h-4 w-4 text-warm-taupe transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && sessions.length > 0 && (
          <>
            {/* Overlay para fechar ao clicar fora */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            
            <div className="absolute top-full left-0 right-0 mt-1 bg-pure-white border border-pale-clay-deep rounded-lg shadow-lg z-20 max-h-[300px] overflow-y-auto">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const isDeleting = deletingId === session.id;
                
                return (
                  <div
                    key={session.id}
                    className={`
                      group flex items-center gap-2 px-3 py-2 hover:bg-pale-clay-light transition-colors
                      ${isActive ? 'bg-pale-clay-light/50' : ''}
                      ${isDeleting ? 'opacity-50' : ''}
                    `}
                  >
                    <button
                      onClick={() => handleSelectSession(session.id)}
                      disabled={isDeleting || loading}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <MessageSquare className={`h-3.5 w-3.5 flex-shrink-0 ${
                        isActive ? 'text-burnt-peach' : 'text-warm-taupe'
                      }`} />
                      <span className={`text-sm truncate ${
                        isActive ? 'font-semibold text-deep-mocha' : 'text-warm-taupe'
                      }`}>
                        {session.title}
                      </span>
                    </button>
                    
                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => handleDelete(e, session.id)}
                        disabled={isDeleting}
                        className="flex-shrink-0 p-1 rounded hover:bg-error-soft hover:text-error-strong transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar conversa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Botão Nova Conversa */}
      <Button
        onClick={onCreateSession}
        disabled={loading}
        size="sm"
        className="flex-shrink-0 bg-burnt-peach hover:bg-burnt-peach-light text-white h-9 px-3 gap-2"
        title="Nova conversa"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline text-sm">Nova</span>
      </Button>
    </div>
  );
}
