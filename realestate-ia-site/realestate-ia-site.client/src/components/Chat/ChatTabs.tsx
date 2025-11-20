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
    <div className="flex items-center gap-2">
      {/* Dropdown de Sessões */}
      <div className="relative flex-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading || sessions.length === 0}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-input hover:bg-accent/10 border border-border hover:border-accent text-left transition-colors"
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground truncate">
              {sessions.length === 0 ? 'Nova Conversa' : (activeSession?.title || 'Nova Conversa')}
            </span>
          </div>
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform flex-shrink-0 ${
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
            
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-strong z-20 max-h-[300px] overflow-y-auto scrollbar-thin">
              {sessions.map((session) => {
                const isActive = session.id === activeSessionId;
                const isDeleting = deletingId === session.id;
                
                return (
                  <div
                    key={session.id}
                    className={`
                      group flex items-center gap-2 px-3 py-2 hover:bg-accent/10 transition-colors border-b border-border last:border-0
                      ${isActive ? 'bg-accent/10' : ''}
                      ${isDeleting ? 'opacity-50' : ''}
                    `}
                  >
                    <button
                      onClick={() => handleSelectSession(session.id)}
                      disabled={isDeleting || loading}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className={`text-sm truncate ${
                        isActive ? 'font-medium text-foreground' : 'text-muted-foreground'
                      }`}>
                        {session.title}
                      </span>
                    </button>
                    
                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => handleDelete(e, session.id)}
                        disabled={isDeleting}
                        className="flex-shrink-0 p-1 rounded hover:bg-error/20 hover:text-error transition-colors text-muted-foreground md:hidden md:group-hover:block"
                        title="Eliminar"
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
        size="icon"
        className="flex-shrink-0 h-9 w-9 bg-input hover:bg-accent/10 border border-border text-muted-foreground hover:text-accent rounded-lg transition-colors"
        title="Nova conversa"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}