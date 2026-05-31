'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { PageShell } from '@/components/admin';
import { ChatPanel, type ChatNachricht } from '@/components/chat/ChatPanel';
import { markChatGesehen } from '@/lib/hooks/useChatUnread';
import { armChatSound, playChatSound } from '@/lib/chatSound';

export default function AdminChatPage() {
  const [nachrichten, setNachrichten] = useState<ChatNachricht[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string>('Orga');

  const eventIdRef = useRef<string | null>(null);
  const letzteLeiterIdRef = useRef<string | null>(null);
  const initialisiertRef = useRef(false);

  const supabase = createClient();

  const verarbeiteNachrichten = useCallback((liste: ChatNachricht[]) => {
    setNachrichten(liste);
    // Neue Leiter-Nachricht? → Ton + (wir sind auf der Seite) als gelesen markieren
    const leiter = liste.filter((n) => n.absender_typ === 'leiter');
    const letzteLeiterId = leiter.length > 0 ? leiter[leiter.length - 1].id : null;
    if (initialisiertRef.current && letzteLeiterId && letzteLeiterId !== letzteLeiterIdRef.current) {
      playChatSound();
    }
    letzteLeiterIdRef.current = letzteLeiterId;
    initialisiertRef.current = true;
    if (eventIdRef.current) markChatGesehen(eventIdRef.current);
  }, []);

  const ladeNachrichten = useCallback(
    async (evId: string) => {
      const { data, error } = await supabase
        .from('chat_nachrichten')
        .select('id, absender_typ, absender_name, inhalt, created_at')
        .eq('event_id', evId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) return;
      verarbeiteNachrichten((data ?? []).slice().reverse() as ChatNachricht[]);
    },
    [supabase, verarbeiteNachrichten],
  );

  // Init: Admin-Name + aktives Event
  useEffect(() => {
    armChatSound();
    let abbruch = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const u = userData?.user;
      if (u && !abbruch) {
        setAdminName(u.user_metadata?.name || u.user_metadata?.full_name || u.email || 'Orga');
      }
      const { data: ev } = await supabase
        .from('events')
        .select('id')
        .eq('ist_aktiv', true)
        .maybeSingle();
      if (abbruch) return;
      const id = ev?.id ?? null;
      eventIdRef.current = id;
      setEventId(id);
      if (id) {
        await ladeNachrichten(id);
      }
      setLoading(false);
    })();
    return () => {
      abbruch = true;
    };
  }, [supabase, ladeNachrichten]);

  // Polling + Fokus-Refresh
  useEffect(() => {
    if (!eventId) return;
    const interval = setInterval(() => void ladeNachrichten(eventId), 5000);
    const onFocus = () => void ladeNachrichten(eventId);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [eventId, ladeNachrichten]);

  const onSend = useCallback(
    async (inhalt: string): Promise<boolean> => {
      if (!eventId) {
        toast.error('Kein aktives Event gefunden.');
        return false;
      }
      const { data, error } = await supabase
        .from('chat_nachrichten')
        .insert({
          event_id: eventId,
          absender_typ: 'admin',
          absender_name: adminName,
          inhalt,
        })
        .select('id, absender_typ, absender_name, inhalt, created_at')
        .single();
      if (error) {
        toast.error('Senden fehlgeschlagen.');
        return false;
      }
      if (data) {
        setNachrichten((prev) =>
          prev.some((n) => n.id === data.id) ? prev : [...prev, data as ChatNachricht],
        );
      }
      void ladeNachrichten(eventId);
      return true;
    },
    [eventId, adminName, supabase, ladeNachrichten],
  );

  return (
    <PageShell
      title="Orga-Chat"
      description="Öffentlicher Chat mit den Spielgruppen-Leitern. Fragen und Antworten sehen alle."
      breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Chat' }]}
    >
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col h-[72vh] max-w-3xl">
        {!loading && !eventId ? (
          <div className="flex-1 flex items-center justify-center text-sm text-slate-500">
            Kein aktives Event.
          </div>
        ) : (
          <ChatPanel
            className="flex-1 min-h-0"
            nachrichten={nachrichten}
            loading={loading}
            onSend={onSend}
            istEigene={(n) => n.absender_typ === 'admin'}
          />
        )}
      </div>
    </PageShell>
  );
}
