'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useConversations, useConversation, useSendAdminMessage } from '@/hooks/use-chat';
import { Send, MessageCircle, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function AdminMessagesPage() {
  const searchParams = useSearchParams();
  const { data: conversations, isLoading: conversationsLoading } = useConversations();
  const [selectedRiderId, setSelectedRiderId] = React.useState<string | null>(null);

  // Arrivée depuis "Contacter le livreur" sur la fiche d'une commande
  // (/messages?rider=<id>) : ouvre directement la conversation concernée
  // au lieu de laisser l'admin la rechercher dans la liste.
  React.useEffect(() => {
    const riderParam = searchParams.get('rider');
    if (riderParam) setSelectedRiderId(riderParam);
  }, [searchParams]);

  const { data: messages, isLoading: messagesLoading } = useConversation(selectedRiderId);
  const sendMessage = useSendAdminMessage();
  const [text, setText] = React.useState('');
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedConversation = conversations?.find((c: any) => c.riderId === selectedRiderId);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !selectedRiderId) return;
    sendMessage.mutate({ riderId: selectedRiderId, content: text.trim() });
    setText('');
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 bg-white -mx-4 md:-mx-6 px-4 md:px-6 py-2 md:py-3 -mt-4 md:-mt-6 mb-2">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 uppercase tracking-widest">Messages</h1>
            <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 font-medium">Conversations avec les chauffeurs.</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[30px] overflow-hidden shadow-sm h-[calc(100vh-13rem)] flex">
          {/* Liste des conversations */}
          <div className={cn(
            'w-full md:w-80 border-r border-slate-100 flex-col shrink-0',
            selectedRiderId ? 'hidden md:flex' : 'flex'
          )}>
            <div className="overflow-y-auto flex-1">
              {conversationsLoading ? (
                <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-fiatlux-primary mx-auto" /></div>
              ) : !conversations || conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Aucune conversation.</p>
                </div>
              ) : (
                conversations.map((c: any) => (
                  <button
                    key={c.riderId}
                    onClick={() => setSelectedRiderId(c.riderId)}
                    className={cn(
                      'w-full text-left px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-2',
                      selectedRiderId === c.riderId && 'bg-slate-50'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{c.riderName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{c.lastMessage?.content || '—'}</p>
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="shrink-0 bg-fiatlux-primary text-white text-[9px] font-black rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                        {c.unreadCount}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Conversation ouverte */}
          <div className={cn('flex-1 flex-col', selectedRiderId ? 'flex' : 'hidden md:flex')}>
            {!selectedRiderId ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-slate-400">Sélectionnez une conversation</p>
              </div>
            ) : (
              <>
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                  <button onClick={() => setSelectedRiderId(null)} className="md:hidden text-slate-400">
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{selectedConversation?.riderName}</p>
                    <p className="text-[10px] text-slate-400">{selectedConversation?.riderPhone}</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30">
                  {messagesLoading ? (
                    <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin text-fiatlux-primary mx-auto" /></div>
                  ) : (
                    messages?.map((m: any) => (
                      <div key={m.id} className={cn('flex', m.senderType === 'ADMIN' ? 'justify-end' : 'justify-start')}>
                        <div className={cn(
                          'max-w-[70%] rounded-2xl px-3.5 py-2 text-xs',
                          m.senderType === 'ADMIN'
                            ? 'bg-fiatlux-primary text-white rounded-br-sm'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                        )}>
                          <p>{m.content}</p>
                          <p className={cn('text-[9px] mt-1', m.senderType === 'ADMIN' ? 'text-white/60' : 'text-slate-400')}>
                            {format(new Date(m.createdAt), 'HH:mm', { locale: fr })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>
                <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t border-slate-100">
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Répondre..."
                    className="flex-1 h-10 rounded-full border border-slate-200 px-4 text-sm focus:outline-none focus:border-fiatlux-primary"
                  />
                  <button
                    type="submit"
                    disabled={!text.trim() || sendMessage.isPending}
                    className="h-10 w-10 rounded-full bg-fiatlux-primary text-white flex items-center justify-center shrink-0 disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}