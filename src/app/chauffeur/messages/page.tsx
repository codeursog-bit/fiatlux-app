'use client';

import * as React from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { ChauffeurLayout } from '@/components/layout/chauffeur-layout';
import { useMyMessages, useSendRiderMessage } from '@/hooks/use-chat';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function ChauffeurMessagesPage() {
  const { data: messages, isLoading } = useMyMessages();
  const sendMessage = useSendRiderMessage();
  const [text, setText] = React.useState('');
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage.mutate(text.trim());
    setText('');
  };

  return (
    <ChauffeurLayout>
      <div className="flex flex-col h-[calc(100vh-9.5rem)]">
        <h1 className="text-lg font-black text-slate-900 mb-3">Messages</h1>

        <div className="flex-1 overflow-y-auto space-y-2 pb-3">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-slate-400">Chargement...</div>
          ) : !messages || messages.length === 0 ? (
            <div className="text-center py-16">
              <MessageCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs text-slate-400">Aucun message pour l'instant.</p>
              <p className="text-[10px] text-slate-400 mt-1">Écrivez à l'administration si besoin.</p>
            </div>
          ) : (
            messages.map((m: any) => (
              <div
                key={m.id}
                className={cn('flex', m.senderType === 'RIDER' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-3.5 py-2 text-xs',
                    m.senderType === 'RIDER'
                      ? 'bg-fiatlux-primary text-white rounded-br-sm'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                  )}
                >
                  <p>{m.content}</p>
                  <p className={cn('text-[9px] mt-1', m.senderType === 'RIDER' ? 'text-white/60' : 'text-slate-400')}>
                    {format(new Date(m.createdAt), 'HH:mm')}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2 pt-2 border-t border-slate-200">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrire un message..."
            className="flex-1 h-12 rounded-full border border-slate-200 px-4 text-sm focus:outline-none focus:border-fiatlux-primary"
          />
          <button
            type="submit"
            disabled={!text.trim() || sendMessage.isPending}
            className="h-12 w-12 rounded-full bg-fiatlux-primary text-white flex items-center justify-center shrink-0 disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </ChauffeurLayout>
  );
}
